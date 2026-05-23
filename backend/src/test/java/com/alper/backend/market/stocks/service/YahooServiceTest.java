package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.client.YahooHttpClient;
import com.alper.backend.market.stocks.dto.YahooQuoteResponse;
import com.alper.backend.market.stocks.mapper.YahooMapper;
import com.alper.backend.market.stocks.model.InstrumentType;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.common.TurkishHolidayUtil;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("YahooService")
class YahooServiceTest {

    @Mock private YahooHttpClient yahooHttpClient;
    @Mock private ObjectMapper objectMapper;
    @Mock private StockRepository stockRepository;
    @Mock private StockPriceHistoryRepository historyRepository;

    private YahooService service;

    // ObjectMapper.readValue throws checked exception; real instance is used for building test fixtures
    private static final ObjectMapper REAL_MAPPER = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new YahooService(
                yahooHttpClient,
                objectMapper,
                new YahooMapper(),
                stockRepository,
                historyRepository,
                mock(ApplicationEventPublisher.class)
        );
    }

    @Test
    @DisplayName("Günlük history güncelse Yahoo çağrısı yapmadan atlar")
    void fetchAndSaveHistorySkipsWhenLatestDailyHistoryIsCurrent() throws Exception {
        LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
        Stock stock = Stock.builder().id(15L).symbol("ASELS.IS").instrumentType(InstrumentType.STOCK).build();
        StockPriceHistory latest = StockPriceHistory.builder()
                .stock(stock)
                .tradeDate(lastCompleted)
                .build();

        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));
        when(historyRepository.findFirstByStockIdOrderByTradeDateDesc(15L))
                .thenReturn(Optional.of(latest));

        // fetchAndUpdateMarketData will try fetchQuote — let it fail gracefully
        when(yahooHttpClient.fetchQuote(anyString())).thenThrow(new RuntimeException("network error"));

        service.fetchAndSaveHistory();

        verify(yahooHttpClient, never()).fetchHistory("ASELS.IS");
        assertThat(latest.getTradeDate()).isEqualTo(lastCompleted);
    }

    @Test
    @DisplayName("Gece çekimi sonrası previousClose/marketCap/52wHigh/Low stock entity'sine yazılır")
    void fetchAndSaveDailyHistoryUpdatesStockMarketData() throws Exception {
        LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
        Stock stock = Stock.builder().id(1L).symbol("AKBNK.IS")
                .instrumentType(InstrumentType.STOCK).isActive(true).build();
        StockPriceHistory latest = StockPriceHistory.builder()
                .stock(stock).tradeDate(lastCompleted).build();

        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));
        when(historyRepository.findFirstByStockIdOrderByTradeDateDesc(1L))
                .thenReturn(Optional.of(latest));

        String quoteJson = "{\"quoteResponse\":{\"result\":[{\"symbol\":\"AKBNK.IS\"," +
                "\"regularMarketPreviousClose\":81.22,\"marketCap\":487000000000," +
                "\"fiftyTwoWeekHigh\":95.70,\"fiftyTwoWeekLow\":52.10}],\"error\":null}}";
        YahooQuoteResponse quoteResponse = REAL_MAPPER.readValue(quoteJson, YahooQuoteResponse.class);

        when(yahooHttpClient.fetchQuote("AKBNK.IS")).thenReturn(quoteJson);
        when(objectMapper.readValue(eq(quoteJson), eq(YahooQuoteResponse.class))).thenReturn(quoteResponse);

        service.fetchAndSaveHistory();

        ArgumentCaptor<Stock> captor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository).save(captor.capture());
        Stock updated = captor.getValue();
        assertThat(updated.getPreviousClose()).isEqualByComparingTo("81.22");
        assertThat(updated.getMarketCap()).isEqualTo(487_000_000_000L);
        assertThat(updated.getFiftyTwoWeekHigh()).isEqualByComparingTo("95.70");
        assertThat(updated.getFiftyTwoWeekLow()).isEqualByComparingTo("52.10");
    }

    @Test
    @DisplayName("Quote API başarısız olsa history akışı duraksatılmaz")
    void marketDataUpdateFailureDoesNotBreakHistoryFlow() throws Exception {
        LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
        Stock stock = Stock.builder().id(1L).symbol("AKBNK.IS")
                .instrumentType(InstrumentType.STOCK).isActive(true).build();
        StockPriceHistory latest = StockPriceHistory.builder()
                .stock(stock).tradeDate(lastCompleted).build();

        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));
        when(historyRepository.findFirstByStockIdOrderByTradeDateDesc(1L))
                .thenReturn(Optional.of(latest));
        when(yahooHttpClient.fetchQuote(anyString()))
                .thenThrow(new RuntimeException("Yahoo rate limit"));

        // Exception'ın dışarı sızmadığını doğrula
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> service.fetchAndSaveHistory());
        verify(stockRepository, never()).save(any(Stock.class));
    }
}
