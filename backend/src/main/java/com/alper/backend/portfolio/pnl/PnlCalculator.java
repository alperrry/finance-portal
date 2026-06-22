package com.alper.backend.portfolio.pnl;

import com.alper.backend.portfolio.model.ManualPosition;

import java.math.BigDecimal;

/**
 * Bir pozisyonun kar/zarar (PnL) tutarını hesaplayan strateji arayüzü.
 *
 * <p>Enstrüman türüne göre farklı uygulamalar {@link PnlCalculatorRegistry}
 * üzerinden seçilir.</p>
 */
public interface PnlCalculator {

    /**
     * Pozisyonun kar/zarar tutarını hesaplar.
     *
     * @param position           hesaplanacak pozisyon
     * @param exitOrCurrentPrice kapanış fiyatı (kapalı pozisyon) veya güncel fiyat (açık pozisyon)
     * @return kar/zarar tutarı
     */
    BigDecimal calculate(ManualPosition position, BigDecimal exitOrCurrentPrice);
}
