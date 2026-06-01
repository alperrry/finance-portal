package com.alper.backend.market.stocks.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Gerçek zamanlı veya gecikmeli fiyat anlık görüntüsünü; bid/ask ve hacim verisiyle birlikte saklar.
 */
@Entity
@Table(name = "stock_price_snapshot")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockPriceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    @Column(name = "price", nullable = false, precision = 18, scale = 4)
    private BigDecimal price;

    @Column(name = "change", precision = 18, scale = 4)
    private BigDecimal change;

    @Column(name = "change_percent", precision = 10, scale = 4)
    private BigDecimal changePercent;

    @Column(name = "open", precision = 18, scale = 4)
    private BigDecimal open;

    @Column(name = "day_high", precision = 18, scale = 4)
    private BigDecimal dayHigh;

    @Column(name = "day_low", precision = 18, scale = 4)
    private BigDecimal dayLow;

    @Column(name = "previous_close", precision = 18, scale = 4)
    private BigDecimal previousClose;

    @Column(name = "volume")
    private Long volume;

    @Column(name = "market_cap")
    private Long marketCap;

    @Column(name = "fifty_two_week_high", precision = 18, scale = 4)
    private BigDecimal fiftyTwoWeekHigh;

    @Column(name = "fifty_two_week_low", precision = 18, scale = 4)
    private BigDecimal fiftyTwoWeekLow;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    @Column(name = "fetched_at", nullable = false, updatable = false)
    private LocalDateTime fetchedAt;

    @PrePersist
    protected void prePersist() {
        this.fetchedAt = LocalDateTime.now();
        this.tradeDate = LocalDate.now();
    }
}