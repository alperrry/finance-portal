package com.alper.backend.portfolio.simulation.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LensResult(
        LensType type,
        BigDecimal costBasis,
        BigDecimal currentValue,
        BigDecimal absolutePnl,
        BigDecimal percentagePnl,
        String currency,
        BigDecimal purchaseRate,
        BigDecimal referenceRate,
        LocalDate referenceDate
) {}
