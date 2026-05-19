package com.alper.backend.market.stocks.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "symbol", nullable = false, unique = true, length = 20)
    private String symbol;

    @Column(name = "short_name", length = 100)
    private String shortName;

    @Column(name = "long_name", length = 255)
    private String longName;

    @Column(name = "sector", length = 100)
    private String sector;

    @Column(name = "industry", length = 100)
    private String industry;

    @Column(name = "exchange", length = 50)
    private String exchange;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "index_name", length = 50)
    private String indexName;

    @Enumerated(EnumType.STRING)
    @Column(name = "instrument_type", nullable = false, length = 20)
    private InstrumentType instrumentType;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Setter
    @Column(name = "previous_close", precision = 18, scale = 4)
    private BigDecimal previousClose;

    @Setter
    @Column(name = "market_cap")
    private Long marketCap;

    @Setter
    @Column(name = "fifty_two_week_high", precision = 18, scale = 4)
    private BigDecimal fiftyTwoWeekHigh;

    @Setter
    @Column(name = "fifty_two_week_low", precision = 18, scale = 4)
    private BigDecimal fiftyTwoWeekLow;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.instrumentType == null) {
            this.instrumentType = InstrumentType.STOCK;
        }
    }

    @PreUpdate
    protected void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
