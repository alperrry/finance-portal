package com.alper.backend.news.websocket;

import com.alper.backend.common.websocket.WebSocketEnvelope;
import com.alper.backend.common.websocket.WebSocketEventType;
import com.alper.backend.common.websocket.WebSocketTopics;
import com.alper.backend.news.event.NewsPublishedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;

/**
 * Yeni haberler yayınlandığında WebSocket üzerinden tüm abonelere thin push gönderen listener.
 *
 * <p>Pattern: <strong>thin push</strong>. Frontend yalnızca newsId ve categoryId listesini alır;
 * filtre uygulayarak ilgilendiği haber için REST endpoint'inden detayı çeker.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class NewsBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNewsPublished(NewsPublishedEvent event) {
        if (event.newsIds() == null || event.newsIds().isEmpty()) {
            log.debug("NewsPublishedEvent boş haber listesi ile geldi, broadcast atlandı");
            return;
        }

        Map<String, Object> data = new HashMap<>();
        data.put("newsIds", event.newsIds());
        data.put("categoryIds", event.categoryIds());

        WebSocketEnvelope<Object> envelope = WebSocketEnvelope.of(
                WebSocketEventType.NEWS_PUBLISHED, data);

        messagingTemplate.convertAndSend(WebSocketTopics.NEWS, envelope);
        log.info("Haber broadcast'i yayınlandı. newsCount={}, categoryCount={}",
                event.newsIds().size(), event.categoryIds() != null ? event.categoryIds().size() : 0);
    }
}