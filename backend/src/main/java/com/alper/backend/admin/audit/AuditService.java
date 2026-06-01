package com.alper.backend.admin.audit;

import com.alper.backend.admin.event.AuditEventPublishedEvent;
import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.repository.AuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;


/**
 * Audit log girişlerini kalıcılaştırıp ilgili event'leri yayan merkezi servis.
 *
 * <p>{@code REQUIRES_NEW} yayılımıyla çağrıldığı iş işleminden bağımsız transaction
 * açar — böylece ana iş rollback olsa bile audit kaydı saklanır. Hedef nesneler JSON
 * snapshot olarak {@link ObjectMapper} ile serileştirilir; yazımdan sonra
 * {@link AuditEventPublishedEvent} ile uygulama içi dinleyicilere haber verilir.</p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog log(
            Long actorUserId,
            String actorUsername,
            AuditAction action,
            String targetType,
            Long targetId,
            Object targetSnapshot,
            Object beforeState,
            Object afterState,
            String reason
    ) {
        AuditLog entry = AuditLog.builder()
                .actorUserId(actorUserId)
                .actorUsername(actorUsername)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .targetSnapshot(toJson(targetSnapshot))
                .beforeState(toJson(beforeState))
                .afterState(toJson(afterState))
                .reason(reason)
                .ipAddress(currentIpAddress())
                .userAgent(currentUserAgent())
                .createdAt(Instant.now())
                .build();

        AuditLog saved = auditLogRepository.save(entry);

        log.info("Audit kaydı oluşturuldu. action={}, actor={}, target={}:{}",
                action, actorUsername, targetType, targetId);

        eventPublisher.publishEvent(new AuditEventPublishedEvent(saved));

        return saved;
    }


    private String toJson(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof String s) {
            return s;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("Audit log JSON serileştirme başarısız. Tip: {}",
                    obj.getClass().getSimpleName(), e);
            return null;
        }
    }

    /**
     * Aktif HTTP isteğinden client IP adresini alır.
     * X-Forwarded-For header'ı varsa onu, yoksa remote address'i kullanır.
     * HTTP context yoksa null döner (örn. scheduler'dan çağrılırsa).
     */
    private String currentIpAddress() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return null;
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            // Birden fazla proxy varsa, ilk IP gerçek client'tır
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Aktif HTTP isteğinden User-Agent header'ını alır.
     */
    private String currentUserAgent() {
        HttpServletRequest request = currentRequest();
        return request != null ? request.getHeader("User-Agent") : null;
    }

    /**
     * Aktif HTTP isteğini döner. HTTP context dışında çağrılırsa null.
     */
    private HttpServletRequest currentRequest() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs != null ? attrs.getRequest() : null;
    }
}