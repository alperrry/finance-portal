package com.alper.backend.market.stocks.service;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Belirli bir işlem günü için bir hissenin tüm teknik gösterge değerlerini bir arada tutan
 * salt-okunur snapshot.
 *
 * <p>{@link StockIndicatorService}'in hesaplama sonucu döndürdüğü çıktıdır; doğrudan
 * veritabanına persist edilmez.</p>
 */
@Getter
@Builder
public class IndicatorSnapshot {
    private final LocalDate tradeDate;

    private final BigDecimal rsi14;
    private final BigDecimal macdLine;
    private final BigDecimal macdSignal;
    private final BigDecimal macdHistogram;
    private final BigDecimal sma20;
    private final BigDecimal sma50;
    private final BigDecimal sma200;
    private final BigDecimal ema12;
    private final BigDecimal ema26;

    private final BigDecimal bollingerUpper;
    private final BigDecimal bollingerMiddle;
    private final BigDecimal bollingerLower;
    private final BigDecimal stochasticK;
    private final BigDecimal stochasticD;
    private final BigDecimal atr14;
    private final BigDecimal ichimokuTenkan;
    private final BigDecimal ichimokuKijun;
    private final BigDecimal ichimokuSenkouA;
    private final BigDecimal ichimokuSenkouB;
}