package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.PortfolioItem;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PortfolioValuationService Testleri")
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

    private PortfolioItem buildStockItem(Long id, Long portfolioId, Long instrId, BigDecimal qty, BigDecimal avgCost) {
        return PortfolioItem.builder()
                .id(id)
                .portfolioId(portfolioId)
                .instrumentType(InstrumentType.STOCK)
                .instrumentId(instrId)
                .quantity(qty)
                .avgCost(avgCost)
                .build();
    }

    @Nested
    @DisplayName("Başarılı Senaryolar")
    class HappyPath {

        @Test
        @DisplayName("Boş portföyde sıfır toplamlar döner")
        void valuate_emptyPortfolio_returnsZeroTotals() {
            when(portfolioItemRepository.findAllByPortfolioId(3L)).thenReturn(List.of());

            PortfolioValuationService.ValuationResult result = service.valuate(3L, "TRY");

            assertThat(result.items()).isEmpty();
            assertThat(result.totalValue()).isEqualByComparingTo("0.00");
            assertThat(result.totalCostBasis()).isEqualByComparingTo("0.00");
            assertThat(result.totalProfitLoss()).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("InstrumentPriceResolverService üzerinden hesaplanan fiyat ve K/Z doğru döner")
        void valuate_singleItem_returnsCorrectValueAndPnl() {
            PortfolioItem item = buildStockItem(7L, 3L, 11L, new BigDecimal("10"), new BigDecimal("100"));

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

        @Test
        @DisplayName("İki pozisyonun değerleri toplamda birleşir")
        void valuate_multipleItems_sumsTotals() {
            PortfolioItem item1 = buildStockItem(1L, 3L, 11L, new BigDecimal("10"), new BigDecimal("100"));
            PortfolioItem item2 = buildStockItem(2L, 3L, 12L, new BigDecimal("5"), new BigDecimal("200"));

            when(portfolioItemRepository.findAllByPortfolioId(3L)).thenReturn(List.of(item1, item2));

            when(instrumentPriceResolverService.resolve(InstrumentType.STOCK, 11L))
                    .thenReturn(new InstrumentPriceResolverService.InstrumentInfo("AKBNK", "Akbank", "TRY", new BigDecimal("150")));
            when(instrumentPriceResolverService.resolve(InstrumentType.STOCK, 12L))
                    .thenReturn(new InstrumentPriceResolverService.InstrumentInfo("GARAN", "Garanti", "TRY", new BigDecimal("250")));
            when(marketQuoteService.getQuote(any(), any())).thenReturn(Optional.empty());

            // item1: currentValue=10*150=1500, costBasis=10*100=1000
            when(currencyConverterService.convert(new BigDecimal("1500"), "TRY", "TRY"))
                    .thenReturn(Optional.of(new BigDecimal("1500")));
            when(currencyConverterService.convert(new BigDecimal("1000"), "TRY", "TRY"))
                    .thenReturn(Optional.of(new BigDecimal("1000")));
            // item2: currentValue=5*250=1250, costBasis=5*200=1000
            when(currencyConverterService.convert(new BigDecimal("1250"), "TRY", "TRY"))
                    .thenReturn(Optional.of(new BigDecimal("1250")));
            when(currencyConverterService.convert(new BigDecimal("1000"), "TRY", "TRY"))
                    .thenReturn(Optional.of(new BigDecimal("1000")));

            PortfolioValuationService.ValuationResult result = service.valuate(3L, "TRY");

            assertThat(result.items()).hasSize(2);
            assertThat(result.totalValue()).isEqualByComparingTo("2750.00");
        }
    }

    @Nested
    @DisplayName("Hata Senaryoları")
    class ErrorCases {

        @Test
        @DisplayName("Güncel fiyat bulunamayan pozisyon toplam değere eklenmez")
        void valuate_whenPriceUnavailable_skipsItemInTotal() {
            PortfolioItem item = buildStockItem(7L, 3L, 11L, new BigDecimal("10"), new BigDecimal("100"));

            when(portfolioItemRepository.findAllByPortfolioId(3L)).thenReturn(List.of(item));
            // resolve returns null currentPrice
            when(instrumentPriceResolverService.resolve(InstrumentType.STOCK, 11L))
                    .thenReturn(new InstrumentPriceResolverService.InstrumentInfo("AKBNK", "Akbank", "TRY", null));
            when(marketQuoteService.getQuote(InstrumentType.STOCK, 11L)).thenReturn(Optional.empty());

            PortfolioValuationService.ValuationResult result = service.valuate(3L, "TRY");

            assertThat(result.items()).hasSize(1);
            assertThat(result.totalValue()).isEqualByComparingTo("0.00");
            assertThat(result.totalCostBasis()).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("Para birimi dönüşümü boş dönerse pozisyon toplama dahil edilmez")
        void valuate_whenCurrencyConversionFails_skipsItemInTotal() {
            PortfolioItem item = buildStockItem(7L, 3L, 11L, new BigDecimal("10"), new BigDecimal("100"));

            when(portfolioItemRepository.findAllByPortfolioId(3L)).thenReturn(List.of(item));
            when(instrumentPriceResolverService.resolve(InstrumentType.STOCK, 11L))
                    .thenReturn(new InstrumentPriceResolverService.InstrumentInfo("AKBNK", "Akbank", "USD", new BigDecimal("5")));
            when(marketQuoteService.getQuote(InstrumentType.STOCK, 11L)).thenReturn(Optional.empty());
            // USD → TRY conversion fails
            when(currencyConverterService.convert(any(), eq("USD"), eq("TRY")))
                    .thenReturn(Optional.empty());

            PortfolioValuationService.ValuationResult result = service.valuate(3L, "TRY");

            assertThat(result.totalValue()).isEqualByComparingTo("0.00");
        }
    }
}
