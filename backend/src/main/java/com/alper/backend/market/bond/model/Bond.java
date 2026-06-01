package com.alper.backend.market.bond.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Devlet veya özel sektör tahvilini; ISIN, vade ve kupon oranıyla tanımlar.
 */
@Entity
@Table(name = "bond")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bond {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evds_series_code", nullable = false, unique = true, length = 100)
    private String evdsSeriesCode;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "bond_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private BondType bondType;

    @Column(name = "maturity_days")
    private Integer maturityDays;

    @Builder.Default
    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "TRY";

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "bond", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BondRateHistory> rateHistory = new ArrayList<>();
}