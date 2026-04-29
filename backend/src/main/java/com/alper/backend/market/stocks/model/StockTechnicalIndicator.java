package com.alper.backend.market.stocks.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_technical_indicator")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockTechnicalIndicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    // RSI - Relative Strength Index
    // 0-100 arası. 70+ aşırı alım, 30- aşırı satım
    @Column(name = "rsi_14", precision = 10, scale = 4)
    private BigDecimal rsi14;

    // MACD - Moving Average Convergence Divergence
    @Column(name = "macd_line", precision = 18, scale = 6)
    private BigDecimal macdLine;

    @Column(name = "macd_signal", precision = 18, scale = 6)
    private BigDecimal macdSignal;

    @Column(name = "macd_histogram", precision = 18, scale = 6)
    private BigDecimal macdHistogram;

    // SMA - Simple Moving Average
    @Column(name = "sma_20", precision = 18, scale = 4)
    private BigDecimal sma20;

    @Column(name = "sma_50", precision = 18, scale = 4)
    private BigDecimal sma50;

    @Column(name = "sma_200", precision = 18, scale = 4)
    private BigDecimal sma200;

    // EMA - Exponential Moving Average
    @Column(name = "ema_12", precision = 18, scale = 4)
    private BigDecimal ema12;

    @Column(name = "ema_26", precision = 18, scale = 4)
    private BigDecimal ema26;
// ===== V12: Premium Indicators =====

    // Bollinger Bands (20-period, 2 stddev)
    @Column(name = "bollinger_upper", precision = 18, scale = 4)
    private BigDecimal bollingerUpper;

    @Column(name = "bollinger_middle", precision = 18, scale = 4)
    private BigDecimal bollingerMiddle;

    @Column(name = "bollinger_lower", precision = 18, scale = 4)
    private BigDecimal bollingerLower;

    // Stochastic Oscillator (14, 3)
    @Column(name = "stochastic_k", precision = 10, scale = 4)
    private BigDecimal stochasticK;

    @Column(name = "stochastic_d", precision = 10, scale = 4)
    private BigDecimal stochasticD;

    // ATR - Average True Range (14)
    @Column(name = "atr_14", precision = 18, scale = 4)
    private BigDecimal atr14;

    // Ichimoku Cloud (4 çizgi — Chikou atlandı)
    // Senkou A/B: hesaplandığı gün yazılır, frontend +26 shift ederek çizer
    @Column(name = "ichimoku_tenkan", precision = 18, scale = 4)
    private BigDecimal ichimokuTenkan;

    @Column(name = "ichimoku_kijun", precision = 18, scale = 4)
    private BigDecimal ichimokuKijun;

    @Column(name = "ichimoku_senkou_a", precision = 18, scale = 4)
    private BigDecimal ichimokuSenkouA;

    @Column(name = "ichimoku_senkou_b", precision = 18, scale = 4)
    private BigDecimal ichimokuSenkouB;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}