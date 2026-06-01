package com.alper.backend.portfolio.pnl;

import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionDirection;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * VIOP P&amp;L hesabı.
 *
 * <pre>
 * multiplier = contractMultiplier != null ? contractMultiplier : 1
 * LONG : (exitOrCurrentPrice - entryPrice) * quantity * multiplier
 * SHORT: (entryPrice - exitOrCurrentPrice) * quantity * multiplier
 * </pre>
 */
public class ViopPnlCalculator implements PnlCalculator {

    @Override
    public BigDecimal calculate(ManualPosition position, BigDecimal exitOrCurrentPrice) {
        BigDecimal multiplier = position.getContractMultiplier() != null
                ? position.getContractMultiplier()
                : BigDecimal.ONE;

        BigDecimal priceDiff;
        if (position.getDirection() == PositionDirection.SHORT) {
            priceDiff = position.getEntryPrice().subtract(exitOrCurrentPrice);
        } else {
            priceDiff = exitOrCurrentPrice.subtract(position.getEntryPrice());
        }

        return priceDiff
                .multiply(position.getQuantity())
                .multiply(multiplier)
                .setScale(2, RoundingMode.HALF_UP);
    }
}
