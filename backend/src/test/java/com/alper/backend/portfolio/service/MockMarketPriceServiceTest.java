package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import org.junit.jupiter.api.BeforeEach;
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
@DisplayName("MockMarketPriceService")
class MockMarketPriceServiceTest {

    @Mock private StockRepository stockRepository;
    @Mock private StockPriceHistoryRepository stockPriceHistoryRepository;
    @Mock private FundPriceRepository fundPriceRepository;
    @Mock private ExchangeRateRepository exchangeRateRepository;
    @Mock private BondRepository bondRepository;
    @Mock private BondRateHistoryRepository bondRateHistoryRepository;

    private MockMarketPriceService service;

    @BeforeEach
    void setUp() {
        service = new MockMarketPriceService(
                stockRepository,
                stockPriceHistoryRepository,
                fundPriceRepository,
                exchangeRateRepository,
                bondRepository,
                bondRateHistoryRepository
        );
    }

    @Test
    @DisplayName("Stock quote currentPrice değerini son günlük kapanış fiyatından döndürür")
    void stockQuoteUsesDailyHistoryClosePriceAsCurrentPrice() {
        StockPriceHistory history = StockPriceHistory.builder()
                .closePrice(new BigDecimal("150.25"))
                .build();

        when(stockPriceHistoryRepository.findFirstByStockIdOrderByTradeDateDesc(11L))
                .thenReturn(Optional.of(history));

        Optional<MockMarketPriceService.MarketPriceQuote> quote = service.getQuote(InstrumentType.STOCK, 11L);

        assertThat(quote).isPresent();
        assertThat(quote.get().currentPrice()).isEqualByComparingTo("150.25");
    }
}
