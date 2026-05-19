package com.alper.backend.portfolio.pnl;

import com.alper.backend.portfolio.model.ManualPosition;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Standart P&L hesabı (STOCK, FUND, CURRENCY, BOND):
 * P&L = (exitOrCurrentPrice - entryPrice) * quantity
 */
public class StandardPnlCalculator implements PnlCalculator {

    @Override
    public BigDecimal calculate(ManualPosition position, BigDecimal exitOrCurrentPrice) {
        return exitOrCurrentPrice
                .subtract(position.getEntryPrice())
                .multiply(position.getQuantity())
                .setScale(2, RoundingMode.HALF_UP);
    }
}
