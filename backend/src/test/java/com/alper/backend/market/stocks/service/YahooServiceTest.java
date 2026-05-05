package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.client.YahooHttpClient;
import com.alper.backend.market.stocks.mapper.YahooMapper;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("YahooService")
class YahooServiceTest {

    @Mock private YahooHttpClient yahooHttpClient;
    @Mock private ObjectMapper objectMapper;
    @Mock private StockRepository stockRepository;
    @Mock private StockPriceSnapshotRepository snapshotRepository;
    @Mock private StockPriceHistoryRepository historyRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    private YahooService service;

    @BeforeEach
    void setUp() {
        service = new YahooService(
                yahooHttpClient,
                objectMapper,
                new YahooMapper(),
                stockRepository,
                snapshotRepository,
                historyRepository,
                eventPublisher
        );
    }

    @Test
    @DisplayName("Kapanış job mevcut günün history satırını son snapshot ile günceller")
    void fetchAndSaveHistoryUpdatesExistingTodayHistoryFromLatestSnapshot() {
        LocalDate today = LocalDate.now();
        Stock stock = Stock.builder().id(15L).symbol("ASELS.IS").build();
        StockPriceHistory existing = StockPriceHistory.builder()
                .stock(stock)
                .tradeDate(today)
                .openPrice(new BigDecimal("422.00"))
                .highPrice(new BigDecimal("436.00"))
                .lowPrice(new BigDecimal("421.50"))
                .closePrice(new BigDecimal("435.00"))
                .volume(5_153_800L)
                .build();
        StockPriceSnapshot latestSnapshot = StockPriceSnapshot.builder()
                .stock(stock)
                .price(new BigDecimal("431.75"))
                .open(new BigDecimal("422.00"))
                .dayHigh(new BigDecimal("443.50"))
                .dayLow(new BigDecimal("421.50"))
                .volume(35_636_201L)
                .build();

        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));
        when(snapshotRepository.findTopByStockIdAndTradeDateOrderByFetchedAtDesc(15L, today))
                .thenReturn(Optional.of(latestSnapshot));
        when(historyRepository.findByStockIdAndTradeDate(15L, today)).thenReturn(Optional.of(existing));

        service.fetchAndSaveHistory();

        assertThat(existing.getClosePrice()).isEqualByComparingTo("431.75");
        assertThat(existing.getHighPrice()).isEqualByComparingTo("443.50");
        assertThat(existing.getVolume()).isEqualTo(35_636_201L);
        verify(historyRepository).save(same(existing));
    }
}
