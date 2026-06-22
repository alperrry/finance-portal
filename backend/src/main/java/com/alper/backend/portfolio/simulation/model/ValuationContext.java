package com.alper.backend.portfolio.simulation.model;

import com.alper.backend.common.model.InstrumentType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Değerleme lenslerinin girdi olarak kullandığı pozisyon bağlamı.
 *
 * <p>"What-if" senaryolarında gerçekte var olmayan (ghost) pozisyonlar da bu
 * bağlam üzerinden temsil edilerek aynı lenslerle hesaplanabilir.</p>
 *
 * @param positionId      pozisyon kimliği (ghost pozisyonlarda {@code null} olabilir)
 * @param instrumentType  enstrüman türü
 * @param instrumentId    enstrüman kaydının kimliği
 * @param purchaseDate    alış tarihi
 * @param costBasisTry    TL cinsinden maliyet
 * @param quantity        miktar
 * @param currentValueTry TL cinsinden güncel değer (açık pozisyon)
 * @param closeValueTry   TL cinsinden kapanış değeri (kapalı pozisyon)
 * @param closeDate       kapanış tarihi (kapalı pozisyon)
 * @param closed          pozisyonun kapalı olup olmadığı
 */
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
