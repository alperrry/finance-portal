package com.alper.backend.portfolio.pnl;

import com.alper.backend.portfolio.model.ManualPosition;

import java.math.BigDecimal;

public interface PnlCalculator {

    BigDecimal calculate(ManualPosition position, BigDecimal exitOrCurrentPrice);
}
