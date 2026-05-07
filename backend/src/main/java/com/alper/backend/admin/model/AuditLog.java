package com.alper.backend.admin.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * Admin işlemlerine ait audit log kaydı.
 *
 * <p>Bu entity salt-yazılır (write-only). Bir kez oluşturulduktan sonra
 * güncellenmez. Update endpoint'i tasarlanmaz, AOP/service üzerinden
 * yalnızca INSERT yapılır.
 *
 * <p>{@code actor_user_id} alanı FK değildir. Kullanıcı silinse bile
 * audit kaydı tarihsel olarak ayakta kalır; bu nedenle {@code actor_username}
 * snapshot olarak yanında tutulur.
 *
 * <p>JSON alanları (target_snapshot, before_state, after_state) JSONB
 * tipindedir. PostgreSQL'in native JSON desteği üzerinden ileride
 * field-level sorgulara olanak tanır.
 *
 * @see AuditAction
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Column(name = "actor_username", nullable = false, length = 100)
    private String actorUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 64)
    private AuditAction action;

    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    /**
     * Hedef objenin işlem anındaki tam JSON gösterimi.
     * Hibernate 6 + PostgreSQL JSONB için {@link JdbcTypeCode} kullanılır.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_snapshot", columnDefinition = "jsonb")
    private String targetSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_state", columnDefinition = "jsonb")
    private String beforeState;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_state", columnDefinition = "jsonb")
    private String afterState;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}