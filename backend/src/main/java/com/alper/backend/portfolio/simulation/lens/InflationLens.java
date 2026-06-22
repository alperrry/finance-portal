package com.alper.backend.portfolio.simulation.lens;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.macro.model.MacroDataType;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Pozisyonu enflasyon düzeltmeli (reel) olarak değerleyen lens.
 *
 * <p>Alış tarihindeki maliyet, TÜFE endeksi oranıyla bugünün (veya kapanış
 * tarihinin) parasına çevrilir; kar/zarar bu reel maliyet üzerinden hesaplanır.</p>
 */
@Component
@RequiredArgsConstructor
public class InflationLens implements ValuationLens {

    private static final int CALC_SCALE = 6;
    private static final int RESULT_SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    // Repomuzu buraya bağlıyoruz
    private final MacroObservationRepository observationRepository;

    @Override
    public LensType getType() {
        return LensType.INFLATION_ADJUSTED;
    }

    @Override
    public boolean supports(InstrumentType instrumentType) {
        return true;
    }

    @Override
    public LensResult apply(ValuationContext ctx) {
        LocalDate entryDate = ctx.purchaseDate();
        LocalDate targetDate = ctx.closed() ? ctx.closeDate() : LocalDate.now();

        // Veritabanından giriş ve hedef endeksleri çek
        BigDecimal entryIndex = getIndexForDate(entryDate);
        BigDecimal targetIndex = getIndexForDate(targetDate);

        // Enflasyon Oranını Bul
        BigDecimal inflationRatio = entryIndex.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ONE
                : targetIndex.divide(entryIndex, CALC_SCALE, ROUNDING);

        // Reel Maliyet
        BigDecimal adjustedCostTry = ctx.costBasisTry().multiply(inflationRatio);

        // Güncel Değer
        BigDecimal currentValueTry = ctx.closed() ? ctx.closeValueTry() : ctx.currentValueTry();

        // Reel Kâr/Zarar
        BigDecimal absolutePnl = currentValueTry.subtract(adjustedCostTry);

        BigDecimal percentagePnl = adjustedCostTry.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : absolutePnl.divide(adjustedCostTry, CALC_SCALE, ROUNDING)
                .multiply(BigDecimal.valueOf(100));

        return new LensResult(
                LensType.INFLATION_ADJUSTED,
                adjustedCostTry.setScale(RESULT_SCALE, ROUNDING),
                currentValueTry.setScale(RESULT_SCALE, ROUNDING),
                absolutePnl.setScale(RESULT_SCALE, ROUNDING),
                percentagePnl.setScale(RESULT_SCALE, ROUNDING),
                "TRY",
                entryIndex.setScale(RESULT_SCALE, ROUNDING),
                targetIndex.setScale(RESULT_SCALE, ROUNDING),
                targetDate
        );
    }

    // YARDIMCI METOT: Tek sorgu atıp değeri dönen yer
    private BigDecimal getIndexForDate(LocalDate date) {
        LocalDate targetMonth = date.withDayOfMonth(1);

        return observationRepository.findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
                        MacroDataType.INFLATION, targetMonth)
                .map(observation -> observation.getValue()) // MacroObservation içindeki value
                .orElse(BigDecimal.ONE);
    }
}