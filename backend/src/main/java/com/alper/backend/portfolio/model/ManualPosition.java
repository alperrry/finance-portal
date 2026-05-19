package com.alper.backend.portfolio.model;

import com.alper.backend.common.model.InstrumentType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "manual_positions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "portfolio_id", nullable = false)
    private Long portfolioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "instrument_type", nullable = false, length = 20)
    private InstrumentType instrumentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "position_kind", nullable = false, length = 10)
    private PositionKind positionKind;

    @Column(name = "instrument_id")
    private Long instrumentId;

    @Column(name = "instrument_symbol", length = 50)
    private String instrumentSymbol;

    @Column(name = "instrument_name", length = 255)
    private String instrumentName;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false, length = 5)
    @Builder.Default
    private PositionDirection direction = PositionDirection.LONG;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(name = "entry_price", nullable = false, precision = 18, scale = 6)
    private BigDecimal entryPrice;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "exit_price", precision = 18, scale = 6)
    private BigDecimal exitPrice;

    @Column(name = "exit_date")
    private LocalDate exitDate;

    @Column(name = "contract_multiplier", precision = 10, scale = 4)
    private BigDecimal contractMultiplier;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "margin_amount", precision = 18, scale = 2)
    private BigDecimal marginAmount;

    @Column(name = "underlying_symbol", length = 50)
    private String underlyingSymbol;

    @Column(name = "interest_rate", precision = 8, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "realized_pnl", precision = 18, scale = 2)
    private BigDecimal realizedPnl;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
