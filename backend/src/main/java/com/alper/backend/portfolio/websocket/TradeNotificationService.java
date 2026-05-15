package com.alper.backend.portfolio.websocket;

import com.alper.backend.common.websocket.WebSocketEnvelope;
import com.alper.backend.common.websocket.WebSocketEventType;
import com.alper.backend.common.websocket.WebSocketTopics;
import com.alper.backend.portfolio.event.TradeApprovedEvent;
import com.alper.backend.portfolio.event.TradeCancelledEvent;
import com.alper.backend.portfolio.event.TradeRejectedEvent;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.user.model.User;
import com.alper.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;

/**
 * Trade lifecycle event'lerini AFTER_COMMIT fazında dinleyip kullanıcıya WebSocket push'u atan servis.
 *
 * <p>Thin push pattern uygulanır: payload sadece transactionId ve portfolioId gibi
 * sinyal alanlarını taşır. Frontend bu sinyali alınca REST endpoint üzerinden
 * güncel veriyi çeker (cache invalidate edildiği için fresh data garanti).</p>
 *
 * <p>WebSocket destination'ı kullanıcının username/keycloakId üzerinden routing yapılır;
 * Spring'in /user prefix'i otomatik olarak Principal name'e map eder.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class TradeNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    /**
     * Trade APPROVED → kullanıcıya TRADE_APPROVED ve PORTFOLIO_UPDATED sinyalleri gönder.
     * Cache invalidate: portfolioValuation::{portfolioId}
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @CacheEvict(value = "portfolioValuation", key = "#event.transaction().getPortfolioId()")
    public void onTradeApproved(TradeApprovedEvent event) {
        String username = resolveUsername(event.userId());
        if (username == null) {
            return;
        }

        TradeTransaction tx = event.transaction();
        sendToUser(username, WebSocketTopics.USER_TRADES,
                WebSocketEventType.TRADE_APPROVED, buildTradePayload(tx));
        sendToUser(username, WebSocketTopics.USER_PORTFOLIO,
                WebSocketEventType.PORTFOLIO_UPDATED, buildPortfolioPayload(tx.getPortfolioId()));

        log.debug("Trade APPROVED bildirimi iletildi. tradeId={}, username={}", tx.getId(), username);
    }

    /**
     * Trade REJECTED → kullanıcıya TRADE_REJECTED bildirimi.
     * Portfolio değerleme değişmediği için sadece USER_TRADES kanalına push.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTradeRejected(TradeRejectedEvent event) {
        String username = resolveUsername(event.userId());
        if (username == null) {
            return;
        }

        TradeTransaction tx = event.transaction();
        Map<String, Object> payload = buildTradePayload(tx);
        payload.put("rejectionReason", event.rejectionReason());

        sendToUser(username, WebSocketTopics.USER_TRADES, WebSocketEventType.TRADE_REJECTED, payload);
        log.debug("Trade REJECTED bildirimi iletildi. tradeId={}, username={}", tx.getId(), username);
    }

    /**
     * Trade CANCELLED → kullanıcıya TRADE_CANCELLED bildirimi.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @CacheEvict(value = "portfolioValuation", key = "#event.transaction().getPortfolioId()")
    public void onTradeCancelled(TradeCancelledEvent event) {
        String username = resolveUsername(event.userId());
        if (username == null) {
            return;
        }

        TradeTransaction tx = event.transaction();
        sendToUser(username, WebSocketTopics.USER_TRADES,
                WebSocketEventType.TRADE_CANCELLED, buildTradePayload(tx));
        log.debug("Trade CANCELLED bildirimi iletildi. tradeId={}, username={}", tx.getId(), username);
    }

    private void sendToUser(String username, String destination, WebSocketEventType type, Object data) {
        WebSocketEnvelope<Object> envelope = WebSocketEnvelope.of(type, data);
        messagingTemplate.convertAndSendToUser(username, destination, envelope);
    }

    private Map<String, Object> buildTradePayload(TradeTransaction tx) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", tx.getId());
        payload.put("portfolioId", tx.getPortfolioId());
        return payload;
    }

    private Map<String, Object> buildPortfolioPayload(Long portfolioId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("portfolioId", portfolioId);
        return payload;
    }

    /**
     * Spring'in /user prefix routing'i için Principal name (Keycloak subject) lazım.
     * users tablosundaki keycloak_id Principal name ile eşleşir
     * (WebSocketAuthInterceptor.authenticate içinde jwt.getSubject() set ediliyor).
     */
    private String resolveUsername(Long userId) {
        if (userId == null) {
            log.warn("Trade event'inde userId null, WebSocket bildirimi atlandı");
            return null;
        }
        return userRepository.findById(userId)
                .map(User::getKeycloakId)
                .orElseGet(() -> {
                    log.warn("Trade event için kullanıcı bulunamadı. userId={}", userId);
                    return null;
                });
    }
}
