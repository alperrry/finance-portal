package com.alper.backend.portfolio.simulation.model;

import com.alper.backend.common.model.InstrumentType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PositionSummary(
        Long id,
        String instrumentSymbol,
        String instrumentName,
        InstrumentType instrumentType,
        BigDecimal quantity,
        LocalDate entryDate,
        String positionKind
) {}
