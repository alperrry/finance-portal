package com.alper.backend.portfolio.simulation.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Bir değerleme lensinin pozisyon için ürettiği sonuç.
 *
 * @param type          sonucu üreten lensin tipi
 * @param costBasis     lens para biriminde maliyet
 * @param currentValue  lens para biriminde güncel (veya kapanış) değer
 * @param absolutePnl   mutlak kar/zarar
 * @param percentagePnl yüzdesel kar/zarar
 * @param currency      sonucun para birimi (örn. "USD", "TRY")
 * @param purchaseRate  alış tarihindeki dönüşüm oranı/endeksi
 * @param referenceRate referans tarihteki dönüşüm oranı/endeksi
 * @param referenceDate referans (güncel veya kapanış) tarih
 */
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
