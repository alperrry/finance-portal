package com.alper.backend.market.bond.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * EVDS üzerinden çekilen tahvil faiz oranı geçmişini tutar.
 */
@Entity
@Table(
        name = "bond_rate_history",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_bond_rate_date",
                columnNames = {"bond_id", "rate_date"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BondRateHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bond_id", nullable = false)
    private Bond bond;

    @Column(name = "rate_date", nullable = false)
    private LocalDate rateDate;

    @Column(name = "interest_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "compounded_rate", precision = 10, scale = 4)
    private BigDecimal compoundedRate;

    @Builder.Default
    @Column(name = "source", nullable = false, length = 20)
    private String source = "TCMB_EVDS";

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}