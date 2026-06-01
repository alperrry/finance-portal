package com.alper.backend.user.drawing.model;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.user.model.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Kullanıcının grafik üzerinde oluşturduğu teknik çizim nesnesini (trend çizgisi, işaret vb.) saklar.
 */
@Entity
@Table(name = "user_chart_drawings")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserChartDrawing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "instrument_type", nullable = false, length = 20)
    private InstrumentType instrumentType;

    @Column(name = "instrument_code", nullable = false, length = 50)
    private String instrumentCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "drawing_type", nullable = false, length = 30)
    private DrawingType drawingType;

    @Setter
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "drawing_data", columnDefinition = "jsonb", nullable = false)
    private String drawingData;

    @Setter
    @Column(name = "color", length = 20)
    private String color;

    @Setter
    @Column(name = "line_width")
    private Integer lineWidth;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}