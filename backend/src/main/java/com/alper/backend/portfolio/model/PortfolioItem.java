package com.alper.backend.portfolio.model;

import com.alper.backend.common.model.InstrumentType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Portföyde kayıtlı bir enstrüman pozisyonunu; sembol, tip ve miktar bilgisini içerir.
 */
@Entity
@Table(
        name = "portfolio_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_portfolio_instrument",
                columnNames = {"portfolio_id", "instrument_type", "instrument_id"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "portfolio_id", nullable = false)
    private Long portfolioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "instrument_type", nullable = false, length = 20)
    private InstrumentType instrumentType;

    @Column(name = "instrument_id", nullable = false)
    private Long instrumentId;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(name = "avg_cost", nullable = false, precision = 18, scale = 6)
    private BigDecimal avgCost;

    @Version
    @Column(nullable = false)
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}