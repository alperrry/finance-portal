package com.alper.backend.portfolio.pnl;

import com.alper.backend.portfolio.model.ManualPosition;

import java.math.BigDecimal;

public interface PnlCalculator {
    /**
     * exitOrCurrentPrice: CLOSED pozisyon için exitPrice, OPEN pozisyon için güncel piyasa fiyatı.
     */
    BigDecimal calculate(ManualPosition position, BigDecimal exitOrCurrentPrice);
}
