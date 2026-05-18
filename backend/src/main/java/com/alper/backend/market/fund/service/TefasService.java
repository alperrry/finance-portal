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
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Log4j2
@Service
@RequiredArgsConstructor
public class TefasService {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    private static final String FUND_TYPE = "YAT";
    private static final int PAGE_SIZE = 1000;
    private static final int MAX_RETRIES = 3;
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final DateTimeFormatter API_DATE = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter PORTAL_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final List<String> FUND_CODES = List.of("MAC", "YAS", "KUT", "TGE", "AFT");

    @Value("${fund.base-url}")
    private String baseUrl;

    @Value("${fund.portal-url:https://www.tefas.gov.tr/tr/fon-verileri}")
    private String portalUrl;

    @Value("${fund.request-delay-ms:300}")
    private long requestDelayMs;

    @Value("${fund.retry-delays-ms:2000,5000,15000}")
    private List<Long> retryDelaysMs;

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
    public TefasFetchResult fetchAndSaveForDate(String fundCode, LocalDate startDate, LocalDate endDate) {
        Fund fund = fundRepository.findByCode(fundCode)
                .orElseThrow(() -> new ExternalApiException("Fon bulunamadı: " + fundCode, ServiceType.TEFAS));

        FetchStats infoStats = fetchAndSaveInfo(fund, startDate, endDate);
        FetchStats allocationStats = fetchAndSaveAllocation(fund, startDate, endDate);

        log.debug("TEFAS verisi kaydedildi. Fon: {}, {} - {}", fundCode, startDate, endDate);
        return new TefasFetchResult(
                infoStats.savedCount(),
                allocationStats.savedCount(),
                infoStats.rowCount(),
                allocationStats.rowCount());
    }

    private FetchStats fetchAndSaveInfo(Fund fund, LocalDate start, LocalDate end) {
        TefasResponse<TefasHistoryInfo> response = fetchNewApi(
                "/api/funds/fonGnlBlgSiraliGetir",
                buildPayload(fund.getCode(), null, start, end, 1, PAGE_SIZE),
                start,
                end,
                TefasHistoryInfo.class,
                "fonGnlBlgSiraliGetir");

        List<TefasHistoryInfo> responseRows = rows(response);
        if (responseRows.isEmpty()) {
            log.warn("TEFAS yanıtında satır yok. endpoint=fonGnlBlgSiraliGetir, fon={}", fund.getCode());
        }
        int saved = 0, skipped = 0;
        for (TefasHistoryInfo dto : responseRows) {
            FundPrice entity = tefasMapper.toFundPriceEntity(dto, fund);
            if (fundPriceRepository.existsByFundIdAndPriceDate(fund.getId(), entity.getPriceDate())) {
                skipped++;
            } else {
                fundPriceRepository.save(entity);
                saved++;
            }
        }
        log.info("TEFAS Info → Fon: {}, Kaydedildi: {}, Atlandı: {}", fund.getCode(), saved, skipped);
        return new FetchStats(saved, responseRows.size());
    }

    private FetchStats fetchAndSaveAllocation(Fund fund, LocalDate start, LocalDate end) {
        TefasResponse<TefasHistoryAllocation> response = fetchNewApi(
                "/api/funds/dagilimSiraliGetirT",
                buildPayload(null, fund.getCode(), start, end, 1, PAGE_SIZE),
                start,
                end,
                TefasHistoryAllocation.class,
                "dagilimSiraliGetirT");

        List<TefasHistoryAllocation> allocationRows = rows(response);
        if (allocationRows.isEmpty()) {
            log.warn("TEFAS yanıtında satır yok. endpoint=dagilimSiraliGetirT, fon={}", fund.getCode());
        }
        int saved = 0, skipped = 0;
        int filteredOut = 0;
        int matchingRows = 0;
        for (TefasHistoryAllocation dto : allocationRows) {
            if (!fund.getCode().equals(trim(dto.getFonKodu()))) {
                filteredOut++;
                continue;
            }
            matchingRows++;
            FundAllocation entity = tefasMapper.toFundAllocationEntity(dto, fund);
            if (fundAllocationRepository.existsByFundIdAndAllocationDate(fund.getId(), entity.getAllocationDate())) {
                skipped++;
            } else {
                fundAllocationRepository.save(entity);
                saved++;
            }
        }
        log.info("TEFAS Allocation → Fon: {}, Kaydedildi: {}, Atlandı: {}, Filtrelenen: {}",
                fund.getCode(), saved, skipped, filteredOut);
        return new FetchStats(saved, matchingRows);
    }

    private <T> TefasResponse<T> fetchNewApi(String endpoint, Map<String, Object> payload, LocalDate start,
                                             LocalDate end, Class<T> rowType, String context) {
        ExternalApiException lastException = null;
        for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                delayBeforeRequest();
                String json = executeJson(endpoint, payload, start, end, context);
                TefasResponse<T> response = parse(json, rowType);
                if (response.getErrorCode() != null || response.getErrorMessage() != null) {
                    throw new ExternalApiException(
                            "TEFAS API hata döndü. Endpoint: " + context + ", errorCode=" + response.getErrorCode()
                                    + ", errorMessage=" + response.getErrorMessage(),
                            ServiceType.TEFAS);
                }
                return response;
            } catch (ExternalApiException e) {
                lastException = e;
                if (!isRetryable(e) || attempt == MAX_RETRIES - 1) {
                    if (e.getMessage() != null && e.getMessage().contains("Boş yanıt")) {
                        log.warn("TEFAS boş yanıt (tarihsel sınır veya throttle). endpoint={}, attempt={}",
                                context, attempt + 1);
                    } else {
                        log.error("TEFAS isteği başarısız. endpoint={}, attempt={}, cause={}",
                                context, attempt + 1, e.getMessage());
                    }
                    throw e;
                }
                log.warn("TEFAS retry: endpoint={}, attempt={}, cause={}", context, attempt + 1, e.getMessage());
                tefasCookieService.invalidate();
                sleep(retryDelay(attempt));
            }
        }
        throw lastException != null ? lastException
                : new ExternalApiException("TEFAS isteği tamamlanamadı. Endpoint: " + context, ServiceType.TEFAS);
    }

    private String executeJson(String endpoint, Map<String, Object> payload, LocalDate start, LocalDate end, String context) {
        String requestJson = serialize(payload);
        Request request = new Request.Builder()
                .url(buildEndpointUrl(endpoint))
                .post(RequestBody.create(requestJson, JSON))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json, text/plain, */*")
                .header("Referer", buildReferer(start, end))
                .header("User-Agent", USER_AGENT)
                .header("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.8")
                .header("Origin", "https://www.tefas.gov.tr")
                .header("Cookie", tefasCookieService.getCookie())
                .build();
        try (Response response = okHttpClient.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";
            if (!response.isSuccessful()) {
                throw new ExternalApiException(
                        "Geçersiz yanıt. Endpoint: " + context + ", HTTP: " + response.code(), ServiceType.TEFAS);
            }
            String json = responseBody.trim();
            if (json.isBlank()) {
                throw new ExternalApiException(
                        "Boş yanıt. Endpoint: " + context + ", HTTP: " + response.code(), ServiceType.TEFAS);
            }
            if (json.startsWith("<")) {
                throw new ExternalApiException("TEFAS HTML/WAF yanıtı döndü. Endpoint: " + context, ServiceType.TEFAS);
            }
            return json;
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("TEFAS'a bağlanılamadı. Endpoint: " + context, e, ServiceType.TEFAS);
        }
    }

    private String buildEndpointUrl(String endpoint) {
        String normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
        return normalizedBaseUrl + normalizedEndpoint;
    }

    private String buildReferer(LocalDate start, LocalDate end) {
        return portalUrl + "?fundType=" + FUND_TYPE
                + "&startDate=" + start.format(PORTAL_DATE)
                + "&endDate=" + end.format(PORTAL_DATE);
    }

    private Map<String, Object> buildPayload(String fundCode, String searchText, LocalDate start, LocalDate end,
                                             int firstRow, int lastRow) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("fonTipi", FUND_TYPE);
        payload.put("fonKodu", fundCode);
        payload.put("aramaMetni", searchText);
        payload.put("fonTurKod", null);
        payload.put("fonGrubu", null);
        payload.put("sfonTurKod", null);
        payload.put("basTarih", start.format(API_DATE));
        payload.put("bitTarih", end.format(API_DATE));
        payload.put("basSira", firstRow);
        payload.put("bitSira", lastRow);
        payload.put("fonTurAciklama", null);
        payload.put("dil", "TR");
        payload.put("kurucuKod", null);
        return payload;
    }

    private String serialize(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new ExternalApiException("TEFAS JSON payload oluşturulamadı.", e, ServiceType.TEFAS);
        }
    }

    private <T> TefasResponse<T> parse(String json, Class<T> rowType) {
        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory().constructParametricType(TefasResponse.class, rowType));
        } catch (Exception e) {
            log.error("TEFAS JSON parse edilemedi. Response: {}", json, e);
            throw new ExternalApiException("TEFAS JSON parse edilemedi.", e, ServiceType.TEFAS);
        }
    }

    private <T> List<T> rows(TefasResponse<T> response) {
        return response.getData() != null ? response.getData() : List.of();
    }

    private boolean isRetryable(ExternalApiException exception) {
        String message = exception.getMessage();
        return message != null && (message.contains("HTTP: 429")
                || message.contains("HTTP: 5")
                || message.contains("HTML/WAF")
                || message.contains("bağlanılamadı")
                || message.contains("Boş yanıt"));
    }

    private long retryDelay(int attempt) {
        if (retryDelaysMs == null || retryDelaysMs.isEmpty()) {
            return 0L;
        }
        return retryDelaysMs.get(Math.min(attempt, retryDelaysMs.size() - 1));
    }

    private void delayBeforeRequest() {
        sleep(requestDelayMs);
    }

    private void sleep(long delayMs) {
        if (delayMs <= 0) {
            return;
        }
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ExternalApiException("TEFAS isteği bekleme sırasında kesildi.", e, ServiceType.TEFAS);
        }
    }

    private String trim(String value) {
        return value != null ? value.trim() : null;
    }

    private record FetchStats(int savedCount, int rowCount) {
    }
}
