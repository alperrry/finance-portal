package com.alper.backend.portfolio.simulation.model;

import com.alper.backend.common.model.InstrumentType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ValuationContext(
        Long positionId,
        InstrumentType instrumentType,
        Long instrumentId,
        LocalDate purchaseDate,
        BigDecimal costBasisTry,
        BigDecimal quantity,
        BigDecimal currentValueTry,
        BigDecimal closeValueTry,
        LocalDate closeDate,
        boolean closed
) {}
