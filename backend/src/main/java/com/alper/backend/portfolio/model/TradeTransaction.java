package com.alper.backend.portfolio.model;

import com.alper.backend.common.model.InstrumentType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "trade_transactions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeTransaction {

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

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 10)
    private TransactionType transactionType;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(name = "target_price", nullable = false, precision = 18, scale = 6)
    private BigDecimal targetPrice;

    @Column(name = "executed_price", precision = 18, scale = 6)
    private BigDecimal executedPrice;

    @Column(name = "total_amount", precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "realized_profit_loss", precision = 18, scale = 2)
    private BigDecimal realizedProfitLoss;

    @Column(name = "reserved_amount", precision = 18, scale = 2)
    private BigDecimal reservedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus status;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "jbpm_process_id", length = 255)
    private String jbpmProcessId;

    @Column(name = "processed_at")
    private Instant processedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
