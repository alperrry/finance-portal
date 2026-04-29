package com.alper.backend.market.stocks.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockIndicatorResponse implements Serializable {

    private String symbol;
    private LocalDate tradeDate;

    // Momentum
    private BigDecimal rsi14;

    // MACD
    private BigDecimal macdLine;
    private BigDecimal macdSignal;
    private BigDecimal macdHistogram;

    // Moving Averages
    private BigDecimal sma20;
    private BigDecimal sma50;
    private BigDecimal sma200;
    private BigDecimal ema12;
    private BigDecimal ema26;

    // Bollinger Bands
    private BigDecimal bollingerUpper;
    private BigDecimal bollingerMiddle;
    private BigDecimal bollingerLower;

    // Stochastic
    private BigDecimal stochasticK;
    private BigDecimal stochasticD;

    // Volatility
    private BigDecimal atr14;

    // Ichimoku (Chikou atlandı; Senkou A/B +26 shift frontend'de)
    private BigDecimal ichimokuTenkan;
    private BigDecimal ichimokuKijun;
    private BigDecimal ichimokuSenkouA;
    private BigDecimal ichimokuSenkouB;
}