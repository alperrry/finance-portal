package com.alper.backend.portfolio.matcher;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.portfolio.model.OrderType;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StockPriceMatcher")
class StockPriceMatcherTest {

    @Mock private StockPriceHistoryRepository historyRepository;

    @Test
    @DisplayName("LIMIT emir tetiklendiğinde target yerine güncel snapshot fiyatını gerçekleşme fiyatı yapar")
    void limitMatchReturnsCurrentSnapshotPrice() {
        StockPriceMatcher matcher = new StockPriceMatcher(historyRepository);
        TradeTransaction transaction = TradeTransaction.builder()
                .id(5L)
                .instrumentType(InstrumentType.STOCK)
                .instrumentId(11L)
                .transactionType(TransactionType.BUY)
                .orderType(OrderType.LIMIT)
                .targetPrice(new BigDecimal("160"))
                .build();
        StockPriceHistory history = StockPriceHistory.builder()
                .closePrice(new BigDecimal("150"))
                .build();

        when(historyRepository.findFirstByStockIdOrderByTradeDateDesc(11L)).thenReturn(Optional.of(history));

        Optional<BigDecimal> executionPrice = matcher.match(transaction);

        assertThat(executionPrice).hasValueSatisfying(price -> assertThat(price).isEqualByComparingTo("150"));
    }
}
