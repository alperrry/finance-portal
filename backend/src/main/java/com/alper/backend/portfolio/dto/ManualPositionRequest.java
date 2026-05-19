package com.alper.backend.portfolio.dto;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.PositionDirection;
import com.alper.backend.portfolio.model.PositionKind;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ManualPositionRequest(
        @NotNull InstrumentType instrumentType,
        @NotNull PositionKind positionKind,
        Long instrumentId,              // nullable for DEPOSIT or manual entry
        String instrumentSymbol,        // user-provided for "Diğer" manual entry
        String instrumentName,          // user-provided for "Diğer" manual entry
        PositionDirection direction,    // default LONG if null
        @NotNull @DecimalMin("0.000001") BigDecimal quantity,
        @NotNull @DecimalMin("0") BigDecimal entryPrice,
        @NotNull LocalDate entryDate,
        BigDecimal exitPrice,           // required if CLOSED
        LocalDate exitDate,             // required if CLOSED
        BigDecimal contractMultiplier,  // VIOP
        LocalDate maturityDate,         // VIOP / DEPOSIT
        BigDecimal marginAmount,        // VIOP
        String underlyingSymbol,        // VIOP (user can override)
        BigDecimal interestRate,        // DEPOSIT (%)
        String bankName,               // DEPOSIT
        String notes
) {}
