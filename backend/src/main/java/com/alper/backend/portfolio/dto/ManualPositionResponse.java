package com.alper.backend.portfolio.dto;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.PositionDirection;
import com.alper.backend.portfolio.model.PositionKind;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Elle girilen pozisyon verilerini API yanıtı olarak döndürür.
 */
public record ManualPositionResponse(
        Long id,
        Long portfolioId,
        InstrumentType instrumentType,
        PositionKind positionKind,
        Long instrumentId,
        String instrumentSymbol,
        String instrumentName,
        PositionDirection direction,
        BigDecimal quantity,
        BigDecimal entryPrice,
        LocalDate entryDate,
        BigDecimal exitPrice,
        LocalDate exitDate,
        BigDecimal contractMultiplier,
        LocalDate maturityDate,
        BigDecimal marginAmount,
        String underlyingSymbol,
        BigDecimal interestRate,
        String bankName,
        BigDecimal realizedPnl,
        BigDecimal unrealizedPnl,
        BigDecimal currentPrice,
        BigDecimal currentValue,
        BigDecimal pnlPercent,
        String notes,
        Instant createdAt
) {}
