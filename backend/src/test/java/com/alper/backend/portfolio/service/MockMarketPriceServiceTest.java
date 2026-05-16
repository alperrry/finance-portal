package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MarketQuoteService")
class MockMarketPriceServiceTest {

    @Mock private StockPriceHistoryRepository stockPriceHistoryRepository;
    @Mock private FundPriceRepository fundPriceRepository;
    @Mock private ExchangeRateRepository exchangeRateRepository;
    @Mock private BondRepository bondRepository;
    @Mock private BondRateHistoryRepository bondRateHistoryRepository;
    @Mock private ViopContractPriceRepository viopContractPriceRepository;

    private MarketQuoteService service;

    @BeforeEach
    void setUp() {
        service = new MarketQuoteService(
                stockPriceHistoryRepository,
                fundPriceRepository,
                exchangeRateRepository,
                bondRepository,
                bondRateHistoryRepository,
                viopContractPriceRepository
        );
    }

    @Test
    @DisplayName("Stock quote currentPrice gerçek kapanış fiyatından hesaplanır")
    void stockQuoteUsesRealClosePrices() {
        StockPriceHistory yesterday = StockPriceHistory.builder()
                .closePrice(new BigDecimal("140.00"))
                .tradeDate(LocalDate.now().minusDays(1))
                .build();
        StockPriceHistory today = StockPriceHistory.builder()
                .closePrice(new BigDecimal("150.25"))
                .tradeDate(LocalDate.now())
                .build();

        // findTop8 returns newest-first
        when(stockPriceHistoryRepository.findTop8ByStockIdOrderByTradeDateDesc(11L))
                .thenReturn(List.of(today, yesterday));

        Optional<MarketQuoteService.MarketPriceQuote> quote = service.getQuote(InstrumentType.STOCK, 11L);

        assertThat(quote).isPresent();
        assertThat(quote.get().currentPrice()).isEqualByComparingTo("150.25");
        assertThat(quote.get().dailyChange()).isEqualByComparingTo("10.25");
        assertThat(quote.get().priceTrend()).hasSize(2);
    }

    @Test
    @DisplayName("Tek kayıt varsa stock quote boş döner")
    void stockQuoteEmptyWhenOnlyOneRecord() {
        StockPriceHistory only = StockPriceHistory.builder()
                .closePrice(new BigDecimal("100.00"))
                .tradeDate(LocalDate.now())
                .build();

        when(stockPriceHistoryRepository.findTop8ByStockIdOrderByTradeDateDesc(5L))
                .thenReturn(List.of(only));

        assertThat(service.getQuote(InstrumentType.STOCK, 5L)).isEmpty();
    }
}
