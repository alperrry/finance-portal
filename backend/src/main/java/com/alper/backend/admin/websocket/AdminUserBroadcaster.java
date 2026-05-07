package com.alper.backend.admin.websocket;

import com.alper.backend.admin.event.UserChangedEvent;
import com.alper.backend.common.websocket.WebSocketEnvelope;
import com.alper.backend.common.websocket.WebSocketEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
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
public class AdminUserBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserChanged(UserChangedEvent event) {
        try {
            WebSocketEventType eventType = mapEventType(event.action());
            WebSocketEnvelope envelope = new WebSocketEnvelope(
                    eventType,
                    toPayload(event),
                    Instant.now()
            );
            messagingTemplate.convertAndSend(AdminWebSocketTopics.USERS, envelope);

            log.debug("User changed event yayınlandı. userId={}, action={}",
                    event.userId(), event.action());

        } catch (Exception e) {
            log.error("User changed event yayınlanamadı. userId={}, action={}",
                    event.userId(), event.action(), e);
        }
    }

    /**
     * Domain event action'unu WebSocket event type'ına çevirir.
     */
    private WebSocketEventType mapEventType(UserChangedEvent.Action action) {
        return switch (action) {
            case ROLE_CHANGED   -> WebSocketEventType.ADMIN_USER_ROLE_CHANGED;
            case STATUS_CHANGED -> WebSocketEventType.ADMIN_USER_STATUS_CHANGED;
            case UPDATED        -> WebSocketEventType.ADMIN_USER_UPDATED;
        };
    }


    private Map<String, Object> toPayload(UserChangedEvent event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", event.userId());
        payload.put("action", event.action());
        payload.put("actorUserId", event.actorUserId());

        if (event.action() == UserChangedEvent.Action.ROLE_CHANGED) {
            payload.put("oldRole", event.oldRole());
            payload.put("newRole", event.newRole());
        } else if (event.action() == UserChangedEvent.Action.STATUS_CHANGED) {
            payload.put("oldActive", event.oldActive());
            payload.put("newActive", event.newActive());
        }

        return payload;
    }
}
