package com.alper.backend.admin.websocket;

import com.alper.backend.admin.event.AuditEventPublishedEvent;
import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.common.websocket.WebSocketEnvelope;
import com.alper.backend.common.websocket.WebSocketEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;


@Component
@RequiredArgsConstructor
@Log4j2
public class AdminAuditBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAuditEvent(AuditEventPublishedEvent event) {
        AuditLog auditLog = event.auditLog();
        try {
            WebSocketEnvelope envelope = new WebSocketEnvelope(
                    WebSocketEventType.ADMIN_AUDIT_LOGGED,
                    toPayload(auditLog),
                    Instant.now()
            );
            messagingTemplate.convertAndSend(AdminWebSocketTopics.AUDIT, envelope);

            log.debug("Audit event yayınlandı. id={}, action={}, target={}:{}",
                    auditLog.getId(), auditLog.getAction(),
                    auditLog.getTargetType(), auditLog.getTargetId());

        } catch (Exception e) {
            log.error("Audit event yayınlanamadı. id={}", auditLog.getId(), e);
        }
    }


    private Map<String, Object> toPayload(AuditLog auditLog) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", auditLog.getId());
        payload.put("actorUsername", auditLog.getActorUsername());
        payload.put("action", auditLog.getAction());
        payload.put("targetType", auditLog.getTargetType());
        payload.put("targetId", auditLog.getTargetId());
        payload.put("reason", auditLog.getReason());
        payload.put("createdAt", auditLog.getCreatedAt());
        return payload;
    }
}