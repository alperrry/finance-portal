package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("YahooBackfillService")
class YahooBackfillServiceTest {

    @Mock private StockRepository stockRepository;
    @Mock private StockPriceHistoryRepository historyRepository;
    @Mock private YahooService yahooService;

    @InjectMocks private YahooBackfillService service;

    private Stock createStock(Long id, String symbol) {
        return Stock.builder()
                .id(id)
                .symbol(symbol)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Aktif hisse yoksa backfill atlanır")
    void skipsWhenNoActiveStocksFound() {
        when(stockRepository.findByIsActiveTrue()).thenReturn(Collections.emptyList());

        service.backfillIfEmpty();

        verifyNoInteractions(yahooService);
        verifyNoInteractions(historyRepository);
    }

    @Test
    @DisplayName("Hissenin hiç geçmiş verisi yoksa backfill başlar")
    void executesBackfillWhenNoHistoryExists() {
        Stock stock = createStock(1L, "AKBNK.IS");
        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));

        // Hiç kayıt yok
        when(historyRepository.findTopByStockIdOrderByTradeDateDesc(1L))
                .thenReturn(Optional.empty());

        service.backfillIfEmpty();

        // fetchAndSaveHistoryForBackfill çağrılmalı
        verify(yahooService).fetchAndSaveHistoryForBackfill(stock);
    }

    @Test
    @DisplayName("Veri güncel ancak gap varsa backfill çalışır")
    void executesBackfillWhenFreshButHasGap() {
        Stock stock = createStock(1L, "AKBNK.IS");
        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));

        StockPriceHistory history = StockPriceHistory.builder().tradeDate(LocalDate.now()).build();
        when(historyRepository.findTopByStockIdOrderByTradeDateDesc(1L))
                .thenReturn(Optional.of(history));

        // Gap var: beklenen (countExistingRecords) 0 dönüyor
        when(historyRepository.countByStockIdAndTradeDateBetween(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(0L);

        service.backfillIfEmpty();

        verify(yahooService).fetchAndSaveHistoryForBackfill(stock);
    }

    @Test
    @DisplayName("Veri güncel ve gap yoksa backfill atlanır")
    void skipsBackfillWhenUpToDateAndNoGap() {
        Stock stock = createStock(1L, "AKBNK.IS");
        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock));

        StockPriceHistory history = StockPriceHistory.builder().tradeDate(LocalDate.now()).build();
        when(historyRepository.findTopByStockIdOrderByTradeDateDesc(1L))
                .thenReturn(Optional.of(history));

        // Gap yok: Çok sayıda veri dönüyor
        when(historyRepository.countByStockIdAndTradeDateBetween(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(999L);

        service.backfillIfEmpty();

        verifyNoInteractions(yahooService);
    }

    @Test
    @DisplayName("Bir hisse için dış servis hata atsa bile diğer hisseler için döngü devam eder")
    void continuesLoopOnExternalServiceError() {
        Stock stock1 = createStock(1L, "AKBNK.IS");
        Stock stock2 = createStock(2L, "THYAO.IS");
        when(stockRepository.findByIsActiveTrue()).thenReturn(List.of(stock1, stock2));

        when(historyRepository.findTopByStockIdOrderByTradeDateDesc(anyLong()))
                .thenReturn(Optional.empty());

        // İlk hisse için hata fırlat
        doThrow(new RuntimeException("API DOWN"))
                .when(yahooService).fetchAndSaveHistoryForBackfill(stock1);

        service.backfillIfEmpty();

        // Hata fırlatılmasına rağmen 2. hisse için de denenmiş olmalı
        verify(yahooService).fetchAndSaveHistoryForBackfill(stock1);
        verify(yahooService).fetchAndSaveHistoryForBackfill(stock2);
    }
}
