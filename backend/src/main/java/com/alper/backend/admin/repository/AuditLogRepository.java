package com.alper.backend.admin.repository;

import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.admin.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * {@link AuditLog} için repository.
 *
 * <p>Bu repository çoğunlukla okuma amaçlı kullanılır. Yazma işlemleri
 * yalnızca {@code AuditService} üzerinden yapılır; başka servisler
 * doğrudan {@code save()} çağırmamalıdır.
 *
 * <p>Sprint 1 kapsamında sadece <strong>actor</strong> ve <strong>target</strong>
 * bazlı sorgular kullanılır. Filtreli arama (action + tarih aralığı) Sprint 3'te
 * Audit Log sayfası ile birlikte eklenecektir.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Belirli bir hedef üzerinde yapılmış tüm audit kayıtlarını döner.
     *
     * <p>User Detail sayfasındaki "Audit Trail" tab'ı için kullanılır.
     * Sonuçlar {@code created_at} alanına göre azalan sırada gelir.
     *
     * @param targetType hedef tipi (örn. "user", "source")
     * @param targetId   hedef kaydın ID'si
     * @param pageable   sayfalama bilgisi
     * @return audit log sayfası
     */
    Page<AuditLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(
            String targetType,
            Long targetId,
            Pageable pageable
    );

    Page<AuditLog> findByTargetTypeInOrderByCreatedAtDesc(
            List<String> targetTypes,
            Pageable pageable
    );

    /**
     * Belirli bir aktörün yaptığı tüm aksiyonları döner.
     *
     * @param actorUserId aktör admin'in ID'si
     * @param pageable    sayfalama bilgisi
     */
    Page<AuditLog> findByActorUserIdOrderByCreatedAtDesc(
            Long actorUserId,
            Pageable pageable
    );

    /**
     * Tüm audit kayıtlarını tarihe göre azalan sırada döner.
     *
     * <p>Audit Log sayfası ana listesi (Sprint 3) ve dashboard'daki
     * "Son Aktiviteler" widget'ı için kullanılır.
     */
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Belirli bir tarih aralığındaki kayıtları, opsiyonel action filtresi ile döner.
     *
     * <p>Audit Log sayfasındaki filtreli sorgular için temel sorgudur.
     * {@code action} parametresi {@code null} ise tüm aksiyonlar döner.
     */
    @Query("""
            SELECT a FROM AuditLog a
            WHERE a.createdAt >= :from
              AND a.createdAt <  :to
              AND (:action IS NULL OR a.action = :action)
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLog> findInRange(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("action") AuditAction action,
            Pageable pageable
    );


    List<AuditLog> findTop10ByOrderByCreatedAtDesc();
}
