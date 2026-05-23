package com.alper.backend.portfolio.simulation.lens;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
import com.alper.backend.portfolio.simulation.service.HistoricalRateResolver;
import com.alper.backend.portfolio.simulation.service.RateDirection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class UsdLens implements ValuationLens {

    private static final int CALC_SCALE = 6;
    private static final int RESULT_SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final HistoricalRateResolver rateResolver;
    private final ExchangeRateRepository exchangeRateRepository;

    @Override
    public LensType getType() {
        return LensType.USD;
    }

    @Override
    public boolean supports(InstrumentType instrumentType) {
        return true;
    }

    @Override
    public LensResult apply(ValuationContext ctx) {
        if (isUsdCurrency(ctx)) {
            BigDecimal valueUsd = ctx.quantity().setScale(RESULT_SCALE, ROUNDING);
            return new LensResult(
                    LensType.USD,
                    valueUsd,
                    valueUsd,
                    BigDecimal.ZERO.setScale(RESULT_SCALE, ROUNDING),
                    BigDecimal.ZERO.setScale(RESULT_SCALE, ROUNDING),
                    "USD",
                    null,
                    null,
                    null
            );
        }

        BigDecimal purchaseRate = rateResolver.resolve("USD", ctx.purchaseDate(), RateDirection.SELLING);
        BigDecimal costUsd = ctx.costBasisTry().divide(purchaseRate, CALC_SCALE, ROUNDING);

        BigDecimal referenceRate;
        LocalDate referenceDate;
        BigDecimal currentUsd;

        if (ctx.closed()) {
            referenceRate = rateResolver.resolve("USD", ctx.closeDate(), RateDirection.BUYING);
            referenceDate = ctx.closeDate();
            currentUsd = ctx.closeValueTry().divide(referenceRate, CALC_SCALE, ROUNDING);
        } else {
            ExchangeRate currentRate = currentRate();
            referenceRate = currentRate.getForexBuying();
            referenceDate = currentRate.getRateDate();
            currentUsd = ctx.currentValueTry().divide(referenceRate, CALC_SCALE, ROUNDING);
        }

        BigDecimal absolutePnl = currentUsd.subtract(costUsd);
        BigDecimal percentagePnl = costUsd.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : absolutePnl.divide(costUsd, CALC_SCALE, ROUNDING)
                        .multiply(BigDecimal.valueOf(100));

        return new LensResult(
                LensType.USD,
                costUsd.setScale(RESULT_SCALE, ROUNDING),
                currentUsd.setScale(RESULT_SCALE, ROUNDING),
                absolutePnl.setScale(RESULT_SCALE, ROUNDING),
                percentagePnl.setScale(RESULT_SCALE, ROUNDING),
                "USD",
                purchaseRate.setScale(RESULT_SCALE, ROUNDING),
                referenceRate.setScale(RESULT_SCALE, ROUNDING),
                referenceDate
        );
    }

    private ExchangeRate currentRate() {
        return exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("USD")
                .filter(rate -> rate.getForexBuying() != null && rate.getForexBuying().compareTo(BigDecimal.ZERO) > 0)
                .orElseThrow(() -> new IllegalStateException("Güncel USD kuru bulunamadı"));
    }

    private boolean isUsdCurrency(ValuationContext ctx) {
        if (ctx.instrumentType() != InstrumentType.CURRENCY || ctx.instrumentId() == null) {
            return false;
        }
        return exchangeRateRepository.findById(ctx.instrumentId())
                .map(ExchangeRate::getCurrencyCode)
                .map(code -> "USD".equalsIgnoreCase(code))
                .orElse(false);
    }

}
