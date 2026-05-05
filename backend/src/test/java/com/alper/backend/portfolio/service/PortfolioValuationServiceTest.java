package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.portfolio.model.PortfolioItem;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PortfolioValuationService")
class PortfolioValuationServiceTest {

    @Mock private PortfolioItemRepository portfolioItemRepository;
    @Mock private CurrencyConverterService currencyConverterService;
    @Mock private StockRepository stockRepository;
    @Mock private StockPriceSnapshotRepository stockPriceSnapshotRepository;
    @Mock private StockPriceHistoryRepository stockPriceHistoryRepository;
    @Mock private FundRepository fundRepository;
    @Mock private FundPriceRepository fundPriceRepository;
    @Mock private ExchangeRateRepository exchangeRateRepository;
    @Mock private BondRepository bondRepository;
    @Mock private BondRateHistoryRepository bondRateHistoryRepository;
    @Mock private MockMarketPriceService mockMarketPriceService;

    private PortfolioValuationService service;

    @BeforeEach
    void setUp() {
        service = new PortfolioValuationService(
                portfolioItemRepository,
                currencyConverterService,
                stockRepository,
                stockPriceSnapshotRepository,
                stockPriceHistoryRepository,
                fundRepository,
                fundPriceRepository,
                exchangeRateRepository,
                bondRepository,
                bondRateHistoryRepository,
                mockMarketPriceService
        );
    }

    @Test
    @DisplayName("Pozisyon fiyatını mock quote yerine en güncel stock snapshot fiyatından hesaplar")
    void valuateUsesLatestStockSnapshotAsCurrentPrice() {
        PortfolioItem item = PortfolioItem.builder()
                .id(7L)
                .portfolioId(3L)
                .instrumentType(InstrumentType.STOCK)
                .instrumentId(11L)
                .quantity(new BigDecimal("10"))
                .avgCost(new BigDecimal("100"))
                .build();
        Stock stock = Stock.builder()
                .id(11L)
                .symbol("AKBNK.IS")
                .shortName("Akbank")
                .currency("TRY")
                .build();
        StockPriceSnapshot snapshot = StockPriceSnapshot.builder()
                .stock(stock)
                .price(new BigDecimal("150"))
                .build();

        when(portfolioItemRepository.findAllByPortfolioId(3L)).thenReturn(List.of(item));
        when(stockRepository.findById(11L)).thenReturn(Optional.of(stock));
        when(stockPriceSnapshotRepository.findFirstByStockIdOrderByFetchedAtDesc(11L)).thenReturn(Optional.of(snapshot));
        when(mockMarketPriceService.getQuote(InstrumentType.STOCK, 11L)).thenReturn(Optional.of(
                new MockMarketPriceService.MarketPriceQuote(
                        new BigDecimal("99"),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        List.of(new BigDecimal("99"))
                )
        ));
        when(currencyConverterService.convert(new BigDecimal("1500"), "TRY", "TRY"))
                .thenReturn(Optional.of(new BigDecimal("1500")));
        when(currencyConverterService.convert(new BigDecimal("1000"), "TRY", "TRY"))
                .thenReturn(Optional.of(new BigDecimal("1000")));

        PortfolioValuationService.ValuationResult result = service.valuate(3L, "TRY");

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().getFirst().currentPrice()).isEqualByComparingTo("150");
        assertThat(result.items().getFirst().currentValue()).isEqualByComparingTo("1500");
        assertThat(result.items().getFirst().profitLoss()).isEqualByComparingTo("500");
        assertThat(result.totalValue()).isEqualByComparingTo("1500.00");
        assertThat(result.totalProfitLoss()).isEqualByComparingTo("500.00");
    }
}
