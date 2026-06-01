package com.alper.backend.market.macro.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Makro seriye ait tekil bir gözlem noktasını; tarih ve değerle tutar.
 */
@Entity
@Table(name = "macro_observation", indexes = {
        @Index(name = "idx_mo_series_date", columnList = "series_id, observation_date")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MacroObservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id", nullable = false)
    private MacroSeries series;

    @Column(name = "observation_date", nullable = false)
    private LocalDate observationDate;

    @Column(name = "value", nullable = false, precision = 18, scale = 6)
    private BigDecimal value;

    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = OffsetDateTime.now();
        if (source == null) source = "EVDS";
    }
}
