package com.alper.backend.market.viop.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.viop.model.ViopContractPrice;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Log4j2
@Service
@RequiredArgsConstructor
public class ViopScraperService {
    private static final int DAILY_CONTRACT_LIMIT = 20;

    @Value("${viop.url}")
    private String viopUrl;

    private final OkHttpClient okHttpClient;
    private final ViopContractPriceRepository repository;

    @Transactional
    public void fetchAndSaveDaily() {
        LocalDate tradeDate = LocalDate.now().minusDays(1);
        if (repository.existsByTradeDate(tradeDate)) {
            log.info("VİOP günlük veri mevcut, fetch atlandı. tradeDate={}", tradeDate);
            return;
        }
        log.info("VİOP HTML çekiliyor. url={}, tradeDate={}", viopUrl, tradeDate);
        String html = fetchHtml();
        Document document = Jsoup.parse(html, viopUrl);
        List<ViopContractPrice> candidates = new ArrayList<>();
        int saved = 0;
        int skipped = 0;

        for (Element table : document.select("table[data-csvname=viop]")) {
            String marketSegment = resolveSegment(table);
            for (Element row : table.select("tbody tr")) {
                Elements cells = row.select("td");
                if (cells.size() < 6) continue;
                String contractName = clean(cells.get(0).text());
                if (contractName == null || contractName.isBlank()) continue;
                if (repository.existsByMarketSegmentAndContractNameAndTradeDate(marketSegment, contractName, tradeDate)) {
                    skipped++;
                    continue;
                }
                ViopContractPrice candidate = ViopContractPrice.builder()
                        .marketSegment(marketSegment)
                        .contractName(contractName)
                        .underlyingSymbol(resolveUnderlying(contractName))
                        .maturityText(resolveMaturity(contractName))
                        .lastPrice(parseDecimal(cells.get(1).text()))
                        .changePercent(parseDecimal(cells.get(2).text()))
                        .changeAmount(parseDecimal(cells.get(3).text()))
                        .volumeTry(parseDecimal(cells.get(4).text()))
                        .volumeQuantity(parseLong(cells.get(5).text()))
                        .tradeDate(tradeDate)
                        .fetchedAt(OffsetDateTime.now())
                        .source("ISYATIRIM")
                        .build();
                if (candidate.getVolumeTry() == null || candidate.getVolumeTry().compareTo(BigDecimal.ZERO) <= 0) {
                    skipped++;
                    continue;
                }
                candidates.add(candidate);
            }
        }

        List<ViopContractPrice> selected = candidates.stream()
                .sorted(Comparator.comparing(ViopContractPrice::getVolumeTry).reversed())
                .limit(DAILY_CONTRACT_LIMIT)
                .toList();

        for (ViopContractPrice row : selected) {
            if (repository.existsByMarketSegmentAndContractNameAndTradeDate(
                    row.getMarketSegment(), row.getContractName(), row.getTradeDate())) {
                skipped++;
                continue;
            }
            repository.save(row);
            saved++;
        }
        log.info("VİOP günlük veri kaydedildi. candidates={}, saved={}, skipped={}",
                candidates.size(), saved, skipped);
    }

    private String fetchHtml() {
        Request request = new Request.Builder()
                .url(viopUrl)
                .header("User-Agent", "finance-portal-viop-fetcher/1.0")
                .build();
        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new ExternalApiException("İş Yatırım VİOP yanıtı geçersiz. HTTP: " + response.code(), ServiceType.VIOP);
            }
            return response.body().string();
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("İş Yatırım VİOP sayfasına bağlanılamadı.", e, ServiceType.VIOP);
        }
    }

    private String resolveSegment(Element table) {
        Element current = table;
        while (current != null) {
            Element heading = current.previousElementSibling();
            while (heading != null) {
                if (heading.tagName().matches("h[1-6]")) {
                    String text = clean(heading.text());
                    if (text != null && !text.isBlank()) return text;
                }
                heading = heading.previousElementSibling();
            }
            current = current.parent();
        }
        log.warn("VİOP segment başlığı bulunamadı, varsayılan kullanılıyor. tableIndex={}", table.elementSiblingIndex());
        return "VİOP";
    }

    private String resolveUnderlying(String contractName) {
        String normalized = contractName == null ? "" : contractName.trim();
        int firstSpace = normalized.indexOf(' ');
        return firstSpace > 0 ? normalized.substring(0, firstSpace) : normalized;
    }

    private String resolveMaturity(String contractName) {
        if (contractName == null) return null;
        String[] months = {"Ocak", "Şubat", "Subat", "Mart", "Nisan", "Mayıs", "Mayis", "Haziran",
                "Temmuz", "Ağustos", "Agustos", "Eylül", "Eylul", "Ekim", "Kasım", "Kasim", "Aralık", "Aralik"};
        for (String month : months) {
            int index = contractName.toLowerCase(Locale.ROOT).indexOf(month.toLowerCase(Locale.ROOT));
            if (index >= 0) return contractName.substring(index).replace(" Vadeli", "").trim();
        }
        return null;
    }

    private BigDecimal parseDecimal(String value) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank() || "-".equals(cleaned)) return null;
        try {
            return new BigDecimal(cleaned.replace(".", "").replace(",", "."));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long parseLong(String value) {
        BigDecimal decimal = parseDecimal(value);
        return decimal == null ? null : decimal.longValue();
    }

    private String clean(String value) {
        return value == null ? null : value.replace('\u00a0', ' ').trim();
    }
}
