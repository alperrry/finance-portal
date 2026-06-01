package com.alper.backend.market.macro.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/**
 * EVDS makro veri serisini; seri kodu, adı ve frekansıyla tanımlar.
 */
@Entity
@Table(name = "macro_series")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MacroSeries {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "series_code", nullable = false, unique = true, length = 100)
    private String seriesCode;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 30)
    private MacroDataType dataType;

    @Column(name = "frequency", nullable = false, length = 20)
    private String frequency;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (source == null) source = "EVDS";
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
