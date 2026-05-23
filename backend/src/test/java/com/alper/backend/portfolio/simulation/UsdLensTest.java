package com.alper.backend.portfolio.simulation;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.portfolio.simulation.lens.UsdLens;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
import com.alper.backend.portfolio.simulation.service.HistoricalRateResolver;
import com.alper.backend.portfolio.simulation.service.RateDirection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UsdLens")
class UsdLensTest {

    @Mock private HistoricalRateResolver rateResolver;
    @Mock private ExchangeRateRepository exchangeRateRepository;

    private UsdLens usdLens;

    private static final LocalDate PURCHASE_DATE = LocalDate.of(2025, 6, 1);
    private static final LocalDate CURRENT_RATE_DATE = LocalDate.of(2026, 5, 18);

    @BeforeEach
    void setUp() {
        usdLens = new UsdLens(rateResolver, exchangeRateRepository);
    }

    private ValuationContext openContext(BigDecimal costBasisTry, BigDecimal currentValueTry) {
        return new ValuationContext(1L, InstrumentType.STOCK, 10L,
                PURCHASE_DATE, costBasisTry, BigDecimal.TEN,
                currentValueTry, null, null, false);
    }

    private ValuationContext closedContext(BigDecimal costBasisTry, BigDecimal closeValueTry,
                                           LocalDate closeDate) {
        return new ValuationContext(2L, InstrumentType.STOCK, 10L,
                PURCHASE_DATE, costBasisTry, BigDecimal.TEN,
                null, closeValueTry, closeDate, true);
    }

    private ValuationContext openCurrencyContext(Long instrumentId, BigDecimal quantity,
                                                 BigDecimal costBasisTry, BigDecimal currentValueTry) {
        return new ValuationContext(3L, InstrumentType.CURRENCY, instrumentId,
                PURCHASE_DATE, costBasisTry, quantity,
                currentValueTry, null, null, false);
    }

    private void stubCurrentRate(BigDecimal buying) {
        ExchangeRate rate = ExchangeRate.builder()
                .currencyCode("USD")
                .currencyName("ABD Doları")
                .unit(1)
                .forexBuying(buying)
                .forexSelling(new BigDecimal("35.00"))
                .rateDate(CURRENT_RATE_DATE)
                .source("TCMB")
                .build();
        when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("USD"))
                .thenReturn(Optional.of(rate));
    }

    @Test
    @DisplayName("getType() USD döner")
    void getTypeIsUsd() {
        assertThat(usdLens.getType()).isEqualTo(LensType.USD);
    }

    @Test
    @DisplayName("supports() tüm instrument tipleri için true")
    void supportsAll() {
        for (InstrumentType type : InstrumentType.values()) {
            assertThat(usdLens.supports(type)).isTrue();
        }
    }

    @Test
    @DisplayName("Açık pozisyon kâr: USD bazında pozitif P&L")
    void openPosition_profit() {
        // Alış: 1 USD = 30 TRY (SELLING)
        // Şimdi: 1 USD = 35 TRY (BUYING)
        // Cost basis: 3000 TRY → 100 USD
        // Current value: 3500 TRY → 100 USD
        // USD P&L = 0 (FX eroded the TRY gain)
        // Let's use numbers where USD gain is positive:
        // Cost: 2000 TRY / 30 = 66.67 USD
        // Current: 4000 TRY / 35 = 114.29 USD
        when(rateResolver.resolve("USD", PURCHASE_DATE, RateDirection.SELLING))
                .thenReturn(new BigDecimal("30.00"));
        stubCurrentRate(new BigDecimal("35.00"));

        LensResult result = usdLens.apply(openContext(
                new BigDecimal("2000.00"),
                new BigDecimal("4000.00")
        ));

        assertThat(result.currency()).isEqualTo("USD");
        assertThat(result.absolutePnl()).isPositive();
        assertThat(result.percentagePnl()).isPositive();
        assertThat(result.purchaseRate()).isEqualByComparingTo(new BigDecimal("30.00"));
        assertThat(result.referenceDate()).isEqualTo(CURRENT_RATE_DATE);
    }

    @Test
    @DisplayName("Açık pozisyon zarar: TRY'de kâr ama USD'de zarar")
    void openPosition_tryGainButUsdLoss() {
        // Cost: 3000 TRY / 30 = 100 USD
        // Current: 3100 TRY / 36 = 86.11 USD
        // USD absolute P&L < 0 even though TRY P&L > 0
        when(rateResolver.resolve("USD", PURCHASE_DATE, RateDirection.SELLING))
                .thenReturn(new BigDecimal("30.00"));
        stubCurrentRate(new BigDecimal("36.00"));

        LensResult result = usdLens.apply(openContext(
                new BigDecimal("3000.00"),
                new BigDecimal("3100.00")
        ));

        assertThat(result.absolutePnl()).isNegative();
    }

    @Test
    @DisplayName("Kapalı pozisyon: alış SELLING, kapanış BUYING oranı kullanılır")
    void closedPosition_correctDirections() {
        LocalDate closeDate = LocalDate.of(2026, 1, 10);

        when(rateResolver.resolve("USD", PURCHASE_DATE, RateDirection.SELLING))
                .thenReturn(new BigDecimal("28.00"));
        when(rateResolver.resolve("USD", closeDate, RateDirection.BUYING))
                .thenReturn(new BigDecimal("32.00"));

        LensResult result = usdLens.apply(closedContext(
                new BigDecimal("2800.00"),  // cost: 100 USD at 28
                new BigDecimal("3200.00"),  // close: 100 USD at 32
                closeDate
        ));

        assertThat(result.currency()).isEqualTo("USD");
        // 3200 / 32 = 100 USD current, 2800 / 28 = 100 USD cost → P&L = 0
        assertThat(result.absolutePnl()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
        assertThat(result.referenceDate()).isEqualTo(closeDate);

        // Verify direction calls
        verify(rateResolver).resolve("USD", PURCHASE_DATE, RateDirection.SELLING);
        verify(rateResolver).resolve("USD", closeDate, RateDirection.BUYING);
    }

    @Test
    @DisplayName("Sıfır maliyet: percentagePnl sıfır, exception yok")
    void zeroCostBasis_returnsZeroPercent() {
        when(rateResolver.resolve("USD", PURCHASE_DATE, RateDirection.SELLING))
                .thenReturn(new BigDecimal("30.00"));
        stubCurrentRate(new BigDecimal("35.00"));

        LensResult result = usdLens.apply(openContext(BigDecimal.ZERO, new BigDecimal("1000.00")));

        assertThat(result.percentagePnl()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
    }

    @Test
    @DisplayName("USD currency pozisyonu zaten USD olduğu için lens çevrimi bypass eder")
    void usdCurrency_bypassesConversion() {
        ExchangeRate usdInstrument = ExchangeRate.builder()
                .id(20L)
                .currencyCode("USD")
                .currencyName("ABD Doları")
                .unit(1)
                .forexBuying(new BigDecimal("40.00"))
                .rateDate(CURRENT_RATE_DATE)
                .source("TCMB")
                .build();
        when(exchangeRateRepository.findById(20L)).thenReturn(Optional.of(usdInstrument));

        LensResult result = usdLens.apply(openCurrencyContext(
                20L,
                new BigDecimal("1000.00"),
                new BigDecimal("35000.00"),
                new BigDecimal("40000.00")
        ));

        assertThat(result.costBasis()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(result.currentValue()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(result.absolutePnl()).isEqualByComparingTo(new BigDecimal("0.00"));
        assertThat(result.percentagePnl()).isEqualByComparingTo(new BigDecimal("0.00"));
        assertThat(result.purchaseRate()).isNull();
        assertThat(result.referenceRate()).isNull();
        verifyNoInteractions(rateResolver);
        verify(exchangeRateRepository, never()).findFirstByCurrencyCodeOrderByRateDateDesc("USD");
    }

    @Test
    @DisplayName("USD dışı currency pozisyonu TRY maliyet ve güncel TRY değer üzerinden USD P&L hesaplar")
    void nonUsdCurrency_usesTryValuesAndUsdRates() {
        ExchangeRate eurInstrument = ExchangeRate.builder()
                .id(21L)
                .currencyCode("EUR")
                .currencyName("Euro")
                .unit(1)
                .forexBuying(new BigDecimal("40.00"))
                .rateDate(CURRENT_RATE_DATE)
                .source("TCMB")
                .build();
        when(exchangeRateRepository.findById(21L)).thenReturn(Optional.of(eurInstrument));
        when(rateResolver.resolve("USD", PURCHASE_DATE, RateDirection.SELLING))
                .thenReturn(new BigDecimal("30.00"));
        stubCurrentRate(new BigDecimal("40.00"));

        LensResult result = usdLens.apply(openCurrencyContext(
                21L,
                new BigDecimal("1000.00"),
                new BigDecimal("35000.00"),
                new BigDecimal("40000.00")
        ));

        assertThat(result.costBasis()).isEqualByComparingTo(new BigDecimal("1166.67"));
        assertThat(result.currentValue()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(result.absolutePnl()).isEqualByComparingTo(new BigDecimal("-166.67"));
        assertThat(result.purchaseRate()).isEqualByComparingTo(new BigDecimal("30.00"));
        assertThat(result.referenceRate()).isEqualByComparingTo(new BigDecimal("40.00"));
    }

}
