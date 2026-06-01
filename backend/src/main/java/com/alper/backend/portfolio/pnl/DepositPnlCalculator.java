package com.alper.backend.portfolio.pnl;

import com.alper.backend.portfolio.model.ManualPosition;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Mevduat (DEPOSIT) P&amp;L hesabı.
 *
 * <pre>
 * exitDate      = position.exitDate != null ? position.exitDate : LocalDate.now()
 * valuationDate = min(exitDate, maturityDate) maturityDate varsa
 * days          = ChronoUnit.DAYS.between(entryDate, valuationDate)
 * rate          = interestRate != null ? interestRate : 0
 * P&amp;L           = quantity * (rate / 100) * (days / 365.0)
 * </pre>
 *
 * <p>{@code exitOrCurrentPrice} parametresi DEPOSIT için kullanılmaz.</p>
 */
public class DepositPnlCalculator implements PnlCalculator {

    @Override
    public BigDecimal calculate(ManualPosition position, BigDecimal exitOrCurrentPrice) {
        LocalDate valuationDate = position.getExitDate() != null ? position.getExitDate() : LocalDate.now();
        if (position.getMaturityDate() != null && valuationDate.isAfter(position.getMaturityDate())) {
            valuationDate = position.getMaturityDate();
        }
        long days = Math.max(0, ChronoUnit.DAYS.between(position.getEntryDate(), valuationDate));
        BigDecimal rate = position.getInterestRate() != null ? position.getInterestRate() : BigDecimal.ZERO;

        return position.getQuantity()
                .multiply(rate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP))
                .multiply(BigDecimal.valueOf(days / 365.0))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
