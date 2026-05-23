package com.alper.backend.market.stocks.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.TurkishHolidayUtil;
import com.alper.backend.market.common.event.MarketDataModule;
import com.alper.backend.market.common.event.MarketDataUpdatedEvent;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
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
import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class YahooService {

    private final YahooHttpClient yahooHttpClient;
    private final ObjectMapper objectMapper;
    private final YahooMapper yahooMapper;
    private final StockRepository stockRepository;
    private final StockPriceHistoryRepository historyRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void fetchAndSaveDailyHistory() {
        log.info("Yahoo Finance günlük history verileri çekiliyor...");
        List<Stock> stocks = stockRepository.findByIsActiveTrue();
        int processed = 0;
        LocalDate newestUpdatedDate = null;
        for (Stock stock : stocks) {
            try {
                LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
                LocalDate latest = historyRepository.findFirstByStockIdOrderByTradeDateDesc(stock.getId())
                        .map(StockPriceHistory::getTradeDate)
                        .orElse(null);
                if (latest == null || latest.isBefore(lastCompleted)) {
                    fetchAndSaveHistoryForBackfill(stock);
                    processed++;
                    newestUpdatedDate = lastCompleted;
                }
            } catch (Exception e) {
                log.error("Yahoo günlük history çekme hatası. Sembol: {}, Hata: {}", stock.getSymbol(), e.getMessage(), e);
            }
        }
        log.info("Yahoo Finance günlük history tamamlandı. Eksik olduğu için işlenen enstrüman: {}", processed);
        fetchAndUpdateMarketData(stocks);
        if (processed > 0) {
            eventPublisher.publishEvent(MarketDataUpdatedEvent.of(
                    MarketDataModule.STOCKS, processed, newestUpdatedDate));
        }
    }

    private void fetchAndUpdateMarketData(List<Stock> stocks) {
        if (stocks.isEmpty()) return;
        try {
            String symbols = buildSymbols(stocks);
            String json = yahooHttpClient.fetchQuote(symbols);
            List<YahooQuoteResult> quotes = parseQuote(json);
            for (YahooQuoteResult quote : quotes) {
                Stock stock = findStock(stocks, quote.getSymbol());
                if (stock == null) continue;
                stock.setPreviousClose(quote.getRegularMarketPreviousClose() != null
                        ? java.math.BigDecimal.valueOf(quote.getRegularMarketPreviousClose()) : null);
                stock.setMarketCap(quote.getMarketCap());
                stock.setFiftyTwoWeekHigh(quote.getFiftyTwoWeekHigh() != null
                        ? java.math.BigDecimal.valueOf(quote.getFiftyTwoWeekHigh()) : null);
                stock.setFiftyTwoWeekLow(quote.getFiftyTwoWeekLow() != null
                        ? java.math.BigDecimal.valueOf(quote.getFiftyTwoWeekLow()) : null);
                stockRepository.save(stock);
            }
            log.info("Market data güncellendi. Hisse sayısı: {}", quotes.size());
        } catch (Exception e) {
            log.warn("Market data güncellemesi başarısız, bir sonraki çekimde tekrar denenecek: {}", e.getMessage());
        }
    }

    @Transactional
    @Deprecated
    public void fetchAndSaveSnapshot() {
        fetchAndSaveDailyHistory();
    }

    @Transactional
    public void fetchAndSaveHistory() {
        fetchAndSaveDailyHistory();
    }

    @Transactional
    public void fetchAndSaveHistoryForBackfill(Stock stock) {
        String json = yahooHttpClient.fetchHistory(stock.getSymbol());
        parseAndSaveHistory(json, stock);
    }

    @Transactional
    @Deprecated
    public void cleanSnapshots() {
        log.debug("Snapshot temizleme günlük veri modelinde devre dışı.");
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

    private BigDecimal toDecimal(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return BigDecimal.valueOf(node.asDouble());
    }

    private Long toLong(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.asLong();
    }
}
