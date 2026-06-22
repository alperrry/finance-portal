package com.alper.backend.portfolio.simulation.model;

import com.alper.backend.common.model.InstrumentType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Simülasyon yanıtında pozisyonu tanıtan özet bilgiler.
 *
 * @param id               pozisyon kimliği
 * @param instrumentSymbol enstrüman sembolü
 * @param instrumentName   enstrüman adı
 * @param instrumentType   enstrüman türü
 * @param quantity         pozisyon miktarı
 * @param entryDate        pozisyona giriş tarihi
 * @param positionKind     pozisyon durumu (açık/kapalı)
 */
public record PositionSummary(
        Long id,
        String instrumentSymbol,
        String instrumentName,
        InstrumentType instrumentType,
        BigDecimal quantity,
        LocalDate entryDate,
        String positionKind
) {}
