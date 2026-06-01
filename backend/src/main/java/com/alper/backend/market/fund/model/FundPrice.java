package com.alper.backend.market.fund.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fon için belirli bir güne ait NAV (net varlık değeri) kaydını tutar.
 */
@Entity
@Table(name = "fund_price", indexes = {
        @Index(name = "idx_fp_fund_date", columnList = "fund_id, price_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fund_id", nullable = false)
    private Fund fund;

    @Column(name = "price_date", nullable = false)
    private LocalDate priceDate;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal price;

    @Column(name = "total_shares", precision = 24, scale = 2)
    private BigDecimal totalShares;

    @Column(name = "investor_count")
    private Integer investorCount;

    @Column(name = "portfolio_size", precision = 24, scale = 2)
    private BigDecimal portfolioSize;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}