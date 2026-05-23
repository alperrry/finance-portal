package com.alper.backend.portfolio.simulation;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.macro.model.MacroDataType;
import com.alper.backend.market.macro.model.MacroObservation;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.portfolio.simulation.lens.InflationLens;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("InflationLens")
class InflationLensTest {

    @Mock private MacroObservationRepository observationRepository;

    private InflationLens inflationLens;

    private static final LocalDate ENTRY_DATE   = LocalDate.of(2024, 1, 15);
    private static final LocalDate CURRENT_DATE = LocalDate.now();

    @BeforeEach
    void setUp() {
        inflationLens = new InflationLens(observationRepository);
    }

    private ValuationContext openCtx(BigDecimal costBasis, BigDecimal currentValue) {
        return new ValuationContext(1L, InstrumentType.STOCK, 10L,
                ENTRY_DATE, costBasis, BigDecimal.TEN,
                currentValue, null, null, false);
    }

    private ValuationContext closedCtx(BigDecimal costBasis, BigDecimal closeValue, LocalDate closeDate) {
        return new ValuationContext(2L, InstrumentType.STOCK, 10L,
                ENTRY_DATE, costBasis, BigDecimal.TEN,
                null, closeValue, closeDate, true);
    }

    private MacroObservation obs(BigDecimal value) {
        return MacroObservation.builder().value(value).build();
    }

    private void stubIndexes(BigDecimal entryIndex, BigDecimal currentIndex) {
        LocalDate entryMonth   = ENTRY_DATE.withDayOfMonth(1);
        LocalDate currentMonth = CURRENT_DATE.withDayOfMonth(1);

        when(observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                eq(MacroDataType.INFLATION), eq(entryMonth)))
                .thenReturn(Optional.of(obs(entryIndex)));

        when(observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                eq(MacroDataType.INFLATION), eq(currentMonth)))
                .thenReturn(Optional.of(obs(currentIndex)));
    }

    @Test
    @DisplayName("getType() INFLATION_ADJUSTED döner")
    void getTypeIsInflationAdjusted() {
        assertThat(inflationLens.getType()).isEqualTo(LensType.INFLATION_ADJUSTED);
    }

    @Test
    @DisplayName("supports() tüm enstrüman tipleri için true")
    void supportsAll() {
        for (InstrumentType type : InstrumentType.values()) {
            assertThat(inflationLens.supports(type)).isTrue();
        }
    }

    @Test
    @DisplayName("Enflasyonu aşan getiri: reel P&L pozitif")
    void openPosition_beatsInflation() {
        // Alışta endeks=1000, şimdi endeks=1200 → %20 enflasyon
        // Maliyet 10_000 TRY, güncel değer 15_000 TRY → %50 nominal getiri
        // Reel maliyet = 10_000 × (1200/1000) = 12_000
        // Reel P&L = 15_000 - 12_000 = 3_000 (pozitif)
        stubIndexes(new BigDecimal("1000"), new BigDecimal("1200"));

        LensResult result = inflationLens.apply(openCtx(
                new BigDecimal("10000.00"),
                new BigDecimal("15000.00")));

        assertThat(result.type()).isEqualTo(LensType.INFLATION_ADJUSTED);
        assertThat(result.currency()).isEqualTo("TRY");
        assertThat(result.costBasis()).isEqualByComparingTo(new BigDecimal("12000.00"));
        assertThat(result.currentValue()).isEqualByComparingTo(new BigDecimal("15000.00"));
        assertThat(result.absolutePnl()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(result.percentagePnl()).isPositive();
        assertThat(result.purchaseRate()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(result.referenceRate()).isEqualByComparingTo(new BigDecimal("1200.00"));
    }

    @Test
    @DisplayName("Enflasyonun altında getiri: nominal kâr ama reel zarar")
    void openPosition_belowInflation() {
        // %20 enflasyon, ama nominal getiri sadece %5
        // Reel maliyet = 10_000 × 1.2 = 12_000, güncel = 10_500 → reel zarar
        stubIndexes(new BigDecimal("1000"), new BigDecimal("1200"));

        LensResult result = inflationLens.apply(openCtx(
                new BigDecimal("10000.00"),
                new BigDecimal("10500.00")));

        assertThat(result.absolutePnl()).isNegative();
        assertThat(result.percentagePnl()).isNegative();
    }

    @Test
    @DisplayName("Enflasyon verisi yoksa ratio=1, maliyet değişmez")
    void noInflationData_fallsBackToRatioOne() {
        when(observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                eq(MacroDataType.INFLATION), any()))
                .thenReturn(Optional.empty());

        LensResult result = inflationLens.apply(openCtx(
                new BigDecimal("10000.00"),
                new BigDecimal("12000.00")));

        // ratio=1/1=1 → adjustedCost = costBasis, absolutePnl = currentValue - costBasis
        assertThat(result.costBasis()).isEqualByComparingTo(new BigDecimal("10000.00"));
        assertThat(result.absolutePnl()).isEqualByComparingTo(new BigDecimal("2000.00"));
    }

    @Test
    @DisplayName("Kapalı pozisyon: closeDate'in endeksi kullanılır, closeValueTry baz alınır")
    void closedPosition_usesCloseDateIndex() {
        LocalDate closeDate = LocalDate.of(2025, 6, 20);
        LocalDate entryMonth = ENTRY_DATE.withDayOfMonth(1);
        LocalDate closeMonth = closeDate.withDayOfMonth(1);

        when(observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                eq(MacroDataType.INFLATION), eq(entryMonth)))
                .thenReturn(Optional.of(obs(new BigDecimal("900"))));
        when(observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                eq(MacroDataType.INFLATION), eq(closeMonth)))
                .thenReturn(Optional.of(obs(new BigDecimal("1080"))));

        // %20 enflasyon, maliyet 9_000 TRY, kapanış 12_000 TRY
        // Reel maliyet = 9_000 × (1080/900) = 10_800
        // Reel P&L = 12_000 - 10_800 = 1_200
        LensResult result = inflationLens.apply(closedCtx(
                new BigDecimal("9000.00"),
                new BigDecimal("12000.00"),
                closeDate));

        assertThat(result.costBasis()).isEqualByComparingTo(new BigDecimal("10800.00"));
        assertThat(result.currentValue()).isEqualByComparingTo(new BigDecimal("12000.00"));
        assertThat(result.absolutePnl()).isEqualByComparingTo(new BigDecimal("1200.00"));
        assertThat(result.referenceDate()).isEqualTo(closeDate);
    }

    @Test
    @DisplayName("Sıfır maliyet: percentagePnl sıfır, exception yok")
    void zeroCostBasis_returnsZeroPercent() {
        stubIndexes(new BigDecimal("1000"), new BigDecimal("1200"));

        LensResult result = inflationLens.apply(openCtx(BigDecimal.ZERO, new BigDecimal("5000.00")));

        assertThat(result.percentagePnl()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
    }

    @Test
    @DisplayName("Enflasyon yoksa (endeks sıfır): sıfıra bölme yok, ratio=1")
    void zeroEntryIndex_noArithmeticException() {
        LocalDate entryMonth   = ENTRY_DATE.withDayOfMonth(1);
        LocalDate currentMonth = CURRENT_DATE.withDayOfMonth(1);

        when(observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                eq(MacroDataType.INFLATION), eq(entryMonth)))
                .thenReturn(Optional.of(obs(BigDecimal.ZERO)));
        when(observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                eq(MacroDataType.INFLATION), eq(currentMonth)))
                .thenReturn(Optional.of(obs(new BigDecimal("1200"))));

        LensResult result = inflationLens.apply(openCtx(
                new BigDecimal("10000.00"),
                new BigDecimal("12000.00")));

        // entryIndex=0 → ratio=1 fallback → adjustedCost = costBasis
        assertThat(result.costBasis()).isEqualByComparingTo(new BigDecimal("10000.00"));
    }
}
