package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.client.YahooHttpClient;
import com.alper.backend.market.stocks.mapper.YahooMapper;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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

    @BeforeEach
    void setUp() {
        service = new YahooService(
                yahooHttpClient,
                objectMapper,
                new YahooMapper(),
                stockRepository,
                historyRepository
        );
    }

    @Test
    @DisplayName("Günlük history güncelse Yahoo çağrısı yapmadan atlar")
    void fetchAndSaveHistorySkipsWhenLatestDailyHistoryIsCurrent() {
        LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
        Stock stock = Stock.builder().id(15L).symbol("ASELS.IS").build();
        StockPriceHistory latest = StockPriceHistory.builder()
                .stock(stock)
                .tradeDate(lastCompleted)
                .build();

        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));
        when(historyRepository.findFirstByStockIdOrderByTradeDateDesc(15L))
                .thenReturn(java.util.Optional.of(latest));

        service.fetchAndSaveHistory();

        verify(yahooHttpClient, never()).fetchHistory("ASELS.IS");
        assertThat(latest.getTradeDate()).isEqualTo(lastCompleted);
    }
}
