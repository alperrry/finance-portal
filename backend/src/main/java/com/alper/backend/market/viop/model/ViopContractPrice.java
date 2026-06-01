package com.alper.backend.market.viop.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Borsa İstanbul VİOP'ta işlem gören vadeli sözleşmenin fiyat kaydını tutar.
 */
@Entity
@Table(name = "viop_contract_price")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViopContractPrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "market_segment", nullable = false, length = 120)
    private String marketSegment;

    @Column(name = "contract_name", nullable = false)
    private String contractName;

    @Column(name = "underlying_symbol", length = 50)
    private String underlyingSymbol;

    @Column(name = "maturity_text", length = 80)
    private String maturityText;

    @Column(name = "last_price", precision = 18, scale = 6)
    private BigDecimal lastPrice;

    @Column(name = "change_percent", precision = 10, scale = 4)
    private BigDecimal changePercent;

    @Column(name = "change_amount", precision = 18, scale = 6)
    private BigDecimal changeAmount;

    @Column(name = "volume_try", precision = 24, scale = 2)
    private BigDecimal volumeTry;

    @Column(name = "volume_quantity")
    private Long volumeQuantity;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    @Column(name = "source", nullable = false, length = 30)
    private String source;

    @PrePersist
    void prePersist() {
        if (fetchedAt == null) fetchedAt = OffsetDateTime.now();
        if (source == null) source = "ISYATIRIM";
    }
}
