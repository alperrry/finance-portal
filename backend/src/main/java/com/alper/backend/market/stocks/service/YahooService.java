package com.alper.backend.market.stocks.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.stocks.event.StockPricesUpdatedEvent;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.market.stocks.client.YahooHttpClient;
import com.alper.backend.market.stocks.dto.YahooQuoteResponse;
import com.alper.backend.market.stocks.dto.YahooQuoteResult;
import com.alper.backend.market.stocks.mapper.YahooMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Log4j2
@Service
@RequiredArgsConstructor
public class YahooService {

    private final YahooHttpClient yahooHttpClient;
    private final ObjectMapper objectMapper;
    private final YahooMapper yahooMapper;
    private final StockRepository stockRepository;
    private final StockPriceSnapshotRepository snapshotRepository;
    private final StockPriceHistoryRepository historyRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void fetchAndSaveSnapshot() {
        log.info("Yahoo Finance anlık fiyatlar çekiliyor...");
        List<Stock> stocks = stockRepository.findByIsActiveTrue();
        String symbols = buildSymbols(stocks);

        List<YahooQuoteResult> results = parseQuote(yahooHttpClient.fetchQuote(symbols));
        List<StockPriceSnapshot> savedSnapshots = new ArrayList<>();
        int saved = 0, skipped = 0;

        for (YahooQuoteResult result : results) {
            Stock stock = findStock(stocks, result.getSymbol());
            if (stock == null) { skipped++; continue; }
            StockPriceSnapshot savedSnapshot = snapshotRepository.save(yahooMapper.toSnapshotEntity(result, stock));
            savedSnapshots.add(savedSnapshot);
            saved++;
        }
        if (!savedSnapshots.isEmpty()) {
            eventPublisher.publishEvent(StockPricesUpdatedEvent.of(savedSnapshots));
        }
        log.info("Snapshot kaydedildi: {}, Atlandı: {}", saved, skipped);
    }

    @Transactional
    public void fetchAndSaveHistory() {
        log.info("Stock günlük history verisi gün içi snapshot'lardan oluşturuluyor...");
        List<Stock> stocks = stockRepository.findByIsActiveTrue();
        LocalDate tradeDate = LocalDate.now();
        int saved = 0, updated = 0, missingSnapshot = 0;

        for (Stock stock : stocks) {
            Optional<StockPriceSnapshot> latestSnapshot = snapshotRepository
                    .findTopByStockIdAndTradeDateOrderByFetchedAtDesc(stock.getId(), tradeDate);

            if (latestSnapshot.isEmpty()) {
                missingSnapshot++;
                log.warn("History oluşturulamadı, gün içi snapshot bulunamadı: {}", stock.getSymbol());
                continue;
            }

            Optional<StockPriceHistory> existingHistory = historyRepository
                    .findByStockIdAndTradeDate(stock.getId(), tradeDate);
            if (existingHistory.isPresent()) {
                applySnapshotToHistory(existingHistory.get(), latestSnapshot.get());
                historyRepository.save(existingHistory.get());
                updated++;
            } else {
                historyRepository.save(yahooMapper.toHistoryEntity(latestSnapshot.get()));
                saved++;
            }
        }
        log.info("History kaydedildi: {}, Güncellendi: {}, Snapshot bulunamadı: {}", saved, updated, missingSnapshot);
    }

    @Transactional
    public void fetchAndSaveHistoryForBackfill(Stock stock) {
        String json = yahooHttpClient.fetchHistory(stock.getSymbol());
        parseAndSaveHistory(json, stock);
    }

    @Transactional
    public void cleanSnapshots() {
        log.info("Snapshot tablosu temizleniyor...");
        snapshotRepository.deleteByTradeDateBefore(LocalDate.now());
        log.info("Snapshot tablosu temizlendi.");
    }

    private void parseAndSaveHistory(String json, Stock stock) {
        try {
            JsonNode root       = objectMapper.readTree(json);
            JsonNode result     = root.path("chart").path("result").get(0);
            JsonNode timestamps = result.path("timestamp");
            JsonNode quote      = result.path("indicators").path("quote").get(0);
            JsonNode adjClose   = result.path("indicators").path("adjclose").get(0).path("adjclose");

            int saved = 0, skipped = 0;

            for (int i = 0; i < timestamps.size(); i++) {
                LocalDate tradeDate = Instant
                        .ofEpochSecond(timestamps.get(i).asLong())
                        .atZone(ZoneId.of("Europe/Istanbul"))
                        .toLocalDate();

                if (!tradeDate.isBefore(LocalDate.now())) {
                    skipped++;
                    continue;
                }

                // Tatil/hafta sonu — Yahoo null fiyat dönebilir, bu satırı atla
                BigDecimal closePrice = toDecimal(quote.path("close").get(i));
                if (closePrice == null) {
                    skipped++;
                    continue;
                }

                if (historyRepository.findByStockIdAndTradeDate(stock.getId(), tradeDate).isPresent()) {
                    skipped++;
                    continue;
                }

                historyRepository.save(StockPriceHistory.builder()
                        .stock(stock)
                        .tradeDate(tradeDate)
                        .openPrice(toDecimal(quote.path("open").get(i)))
                        .highPrice(toDecimal(quote.path("high").get(i)))
                        .lowPrice(toDecimal(quote.path("low").get(i)))
                        .closePrice(closePrice)
                        .adjClose(toDecimal(adjClose.get(i)))
                        .volume(toLong(quote.path("volume").get(i)))
                        .build());
                saved++;
            }

            log.info("{} → Kaydedildi: {}, Atlandı: {}", stock.getSymbol(), saved, skipped);

        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("History JSON parse edilemedi: " + stock.getSymbol(), e, ServiceType.YAHOO);
        }
    }

    private List<YahooQuoteResult> parseQuote(String json) {
        try {
            YahooQuoteResponse response = objectMapper.readValue(json, YahooQuoteResponse.class);
            if (response.getQuoteResponse() == null || response.getQuoteResponse().getResult() == null) {
                throw new ExternalApiException("Yahoo Finance yanıtı boş veya geçersiz.", ServiceType.YAHOO);
            }
            return response.getQuoteResponse().getResult();
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("Yahoo Finance JSON parse edilemedi.", e, ServiceType.YAHOO);
        }
    }

    private String buildSymbols(List<Stock> stocks) {
        return stocks.stream()
                .map(Stock::getSymbol)
                .reduce((a, b) -> a + "," + b)
                .orElseThrow(() -> new ExternalApiException("Aktif hisse bulunamadı.", ServiceType.YAHOO));
    }

    private Stock findStock(List<Stock> stocks, String symbol) {
        return stocks.stream()
                .filter(s -> s.getSymbol().equals(symbol))
                .findFirst()
                .orElse(null);
    }

    private void applySnapshotToHistory(StockPriceHistory history, StockPriceSnapshot snapshot) {
        history.setOpenPrice(snapshot.getOpen());
        history.setHighPrice(snapshot.getDayHigh());
        history.setLowPrice(snapshot.getDayLow());
        history.setClosePrice(snapshot.getPrice());
        history.setVolume(snapshot.getVolume());
    }

    private BigDecimal toDecimal(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return BigDecimal.valueOf(node.asDouble());
    }

    private Long toLong(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.asLong();
    }
}
