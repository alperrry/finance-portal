package com.alper.backend.market.common.websocket;

import com.alper.backend.common.websocket.WebSocketEnvelope;
import com.alper.backend.common.websocket.WebSocketEventType;
import com.alper.backend.common.websocket.WebSocketTopics;
import com.alper.backend.market.common.event.MarketDataModule;
import com.alper.backend.market.common.event.MarketDataUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;

/**
 * Piyasa verisi güncellemelerini WebSocket üzerinden istemcilere yayınlar.
 *
 * <p>{@link MarketDataUpdatedEvent} olaylarını transaction commit sonrası dinler;
 * her modülü kendi event tipine ve konusuna (topic) eşleyerek gönderir.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class MarketDataBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Güncelleme olayını ilgili modülün WebSocket konusuna yayınlar;
     * güncellenen kayıt yoksa yayın atlanır.
     *
     * @param event piyasa verisi güncelleme olayı
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMarketDataUpdated(MarketDataUpdatedEvent event) {
        if (event.updatedCount() <= 0) {
            log.debug("Market update event boş, broadcast atlandı. module={}", event.module());
            return;
        }

        Map<String, Object> data = new HashMap<>();
        data.put("module", event.module().name());
        data.put("updatedCount", event.updatedCount());
        data.put("dataDate", event.dataDate());
        data.put("fetchedAt", event.fetchedAt());

        WebSocketEnvelope<Object> envelope = WebSocketEnvelope.of(eventType(event.module()), data);
        messagingTemplate.convertAndSend(topic(event.module()), envelope);
        log.info("Market data broadcast'i yayınlandı. module={}, updatedCount={}",
                event.module(), event.updatedCount());
    }

    private WebSocketEventType eventType(MarketDataModule module) {
        return switch (module) {
            case STOCKS -> WebSocketEventType.STOCK_PRICES_UPDATED;
            case FUNDS -> WebSocketEventType.FUND_PRICES_UPDATED;
            case VIOP -> WebSocketEventType.VIOP_PRICES_UPDATED;
            case BONDS -> WebSocketEventType.BOND_RATES_UPDATED;
        };
    }

    private String topic(MarketDataModule module) {
        return switch (module) {
            case STOCKS -> WebSocketTopics.STOCKS_PRICES;
            case FUNDS -> WebSocketTopics.FUNDS_PRICES;
            case VIOP -> WebSocketTopics.VIOP_PRICES;
            case BONDS -> WebSocketTopics.BONDS_RATES;
        };
    }
}
