package com.alper.backend.market.fund.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.fund.dto.TefasHistoryAllocation;
import com.alper.backend.market.fund.dto.TefasHistoryInfo;
import com.alper.backend.market.fund.dto.TefasResponse;
import com.alper.backend.market.fund.mapper.TefasMapper;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class TefasService {

    private static final String REFERER    = "https://www.tefas.gov.tr/FonAnaliz.aspx";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String FUND_TYPE  = "YAT";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final List<String> FUND_CODES = List.of("MAC", "YAS", "KUT", "TGE", "AFT");

    @Value("${fund.base-url}")
    private String baseUrl;

    private final OkHttpClient okHttpClient;
    private final ObjectMapper objectMapper;
    private final TefasMapper tefasMapper;
    private final TefasCookieService tefasCookieService;
    private final FundRepository fundRepository;
    private final FundPriceRepository fundPriceRepository;
    private final FundAllocationRepository fundAllocationRepository;

    @Transactional
    public void fetchAndSave() {
        LocalDate today = LocalDate.now();
        log.info("TEFAS fon verisi çekiliyor. Tarih: {}", today);
        for (String code : FUND_CODES) {
            try {
                fetchAndSaveForDate(code, today, today);
            } catch (Exception e) {
                log.error("TEFAS veri çekme hatası. Fon: {}, Hata: {}", code, e.getMessage(), e);
            }
        }
    }

    @Transactional
    public void fetchAndSaveForDate(String fundCode, LocalDate startDate, LocalDate endDate) {
        Fund fund = fundRepository.findByCode(fundCode)
                .orElseThrow(() -> new ExternalApiException("Fon bulunamadı: " + fundCode, ServiceType.TEFAS));

        String start = startDate.format(FMT);
        String end   = endDate.format(FMT);

        fetchAndSaveInfo(fund, start, end);
        fetchAndSaveAllocation(fund, start, end);

        log.debug("TEFAS verisi kaydedildi. Fon: {}, {} - {}", fundCode, start, end);
    }

    private void fetchAndSaveInfo(Fund fund, String start, String end) {
        String json = fetch("BindHistoryInfo", fund.getCode(), start, end, false);
        TefasResponse<TefasHistoryInfo> response = parse(json,
                new TypeReference<TefasResponse<TefasHistoryInfo>>() {});

        int saved = 0, skipped = 0;
        for (TefasHistoryInfo dto : response.getData()) {
            FundPrice entity = tefasMapper.toFundPriceEntity(dto, fund);
            if (fundPriceRepository.existsByFundIdAndPriceDate(fund.getId(), entity.getPriceDate())) {
                skipped++;
            } else {
                fundPriceRepository.save(entity);
                saved++;
            }
        }
        log.info("TEFAS Info → Fon: {}, Kaydedildi: {}, Atlandı: {}", fund.getCode(), saved, skipped);
    }

    private void fetchAndSaveAllocation(Fund fund, String start, String end) {
        String json = fetch("BindHistoryAllocation", fund.getCode(), start, end, false);
        TefasResponse<TefasHistoryAllocation> response = parse(json,
                new TypeReference<TefasResponse<TefasHistoryAllocation>>() {});

        int saved = 0, skipped = 0;
        for (TefasHistoryAllocation dto : response.getData()) {
            FundAllocation entity = tefasMapper.toFundAllocationEntity(dto, fund);
            if (fundAllocationRepository.existsByFundIdAndAllocationDate(fund.getId(), entity.getAllocationDate())) {
                skipped++;
            } else {
                fundAllocationRepository.save(entity);
                saved++;
            }
        }
        log.info("TEFAS Allocation → Fon: {}, Kaydedildi: {}, Atlandı: {}", fund.getCode(), saved, skipped);
    }

    private String fetch(String endpoint, String fundCode, String start, String end, boolean isRetry) {
        RequestBody body = new FormBody.Builder()
                .add("fontip", FUND_TYPE)
                .add("sfonkod", fundCode)
                .add("fonkod", fundCode)
                .add("bastarih", start)
                .add("bittarih", end)
                .build();

        Request request = new Request.Builder()
                .url(baseUrl + endpoint)
                .post(body)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("X-Requested-With", "XMLHttpRequest")
                .header("Referer", REFERER)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json, text/javascript, */*; q=0.01")
                .header("Accept-Language", "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Origin", "https://www.tefas.gov.tr")
                .header("Cookie", tefasCookieService.getCookie())
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new ExternalApiException(
                        "Geçersiz yanıt. Endpoint: " + endpoint + ", HTTP: " + response.code(), ServiceType.TEFAS);
            }
            String json = response.body().string();
            if (json.startsWith("<") && !isRetry) {
                log.warn("TEFAS WAF engeli tespit edildi, cookie yenileniyor...");
                tefasCookieService.invalidate();
                return fetch(endpoint, fundCode, start, end, true);
            }
            if (json.startsWith("<")) {
                throw new ExternalApiException("TEFAS WAF engeli aşılamadı. Endpoint: " + endpoint, ServiceType.TEFAS);
            }
            return json;
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("TEFAS'a bağlanılamadı. Endpoint: " + endpoint, e, ServiceType.TEFAS);
        }
    }

    private <T> T parse(String json, TypeReference<T> typeReference) {
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (Exception e) {
            log.error("TEFAS JSON parse edilemedi. Response: {}", json, e);
            throw new ExternalApiException("TEFAS JSON parse edilemedi.", e, ServiceType.TEFAS);
        }
    }
}