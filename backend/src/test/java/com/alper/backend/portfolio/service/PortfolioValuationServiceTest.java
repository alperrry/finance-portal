package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
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
    @Mock private MarketQuoteService marketQuoteService;
    @Mock private InstrumentPriceResolverService instrumentPriceResolverService;

    private PortfolioValuationService service;

    @BeforeEach
    void setUp() {
        service = new PortfolioValuationService(
                portfolioItemRepository,
                currencyConverterService,
                marketQuoteService,
                instrumentPriceResolverService
        );
    }

    @Test
    @DisplayName("Pozisyon fiyatını InstrumentPriceResolverService üzerinden hesaplar")
    void valuateUsesResolvedCurrentPrice() {
        PortfolioItem item = PortfolioItem.builder()
                .id(7L)
                .portfolioId(3L)
                .instrumentType(InstrumentType.STOCK)
                .instrumentId(11L)
                .quantity(new BigDecimal("10"))
                .avgCost(new BigDecimal("100"))
                .build();

        when(portfolioItemRepository.findAllByPortfolioId(3L)).thenReturn(List.of(item));
        when(instrumentPriceResolverService.resolve(InstrumentType.STOCK, 11L))
                .thenReturn(new InstrumentPriceResolverService.InstrumentInfo("AKBNK.IS", "Akbank", "TRY", new BigDecimal("150")));
        when(marketQuoteService.getQuote(InstrumentType.STOCK, 11L)).thenReturn(Optional.of(
                new MarketQuoteService.MarketPriceQuote(
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
