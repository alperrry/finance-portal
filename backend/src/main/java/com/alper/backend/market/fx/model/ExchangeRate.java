package com.alper.backend.market.fx.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_rate", indexes = {
        @Index(name = "idx_er_code_date", columnList = "currency_code, rate_date")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "currency_name", nullable = false, length = 100)
    private String currencyName;

    @Column(name = "unit", nullable = false)
    private Integer unit;

    @Column(name = "forex_buying", precision = 18, scale = 4)
    private BigDecimal forexBuying;

    @Column(name = "forex_selling", precision = 18, scale = 4)
    private BigDecimal forexSelling;

    @Column(name = "banknote_buying", precision = 18, scale = 4)
    private BigDecimal banknoteBuying;

    @Column(name = "banknote_selling", precision = 18, scale = 4)
    private BigDecimal banknoteSelling;

    @Column(name = "rate_date", nullable = false)
    private LocalDate rateDate;

    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}