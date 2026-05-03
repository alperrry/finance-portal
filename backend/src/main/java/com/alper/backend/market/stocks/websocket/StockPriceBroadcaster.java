package com.alper.backend.market.stocks.websocket;

import com.alper.backend.common.websocket.WebSocketEnvelope;
import com.alper.backend.common.websocket.WebSocketEventType;
import com.alper.backend.common.websocket.WebSocketTopics;
import com.alper.backend.market.stocks.event.StockPricesUpdatedEvent;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Hisse senedi fiyat güncellemelerini WebSocket üzerinden tüm abonelere yayınlayan listener.
 *
 * <p>Pattern: <strong>full push</strong>. 30 BIST hissesi için yaklaşık 6KB payload tek mesajda iletilir;
 * frontend tek bir round-trip ile tüm fiyatları günceller.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class StockPriceBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPricesUpdated(StockPricesUpdatedEvent event) {
        if (event.snapshots() == null || event.snapshots().isEmpty()) {
            log.debug("StockPricesUpdatedEvent boş snapshot listesi ile geldi, broadcast atlandı");
            return;
        }

        List<Map<String, Object>> snapshotPayloads = event.snapshots().stream()
                .map(this::toPayload)
                .toList();

        Map<String, Object> data = new HashMap<>();
        data.put("snapshots", snapshotPayloads);
        data.put("fetchedAt", event.fetchedAt());

        WebSocketEnvelope<Object> envelope = WebSocketEnvelope.of(
                WebSocketEventType.STOCK_PRICES_UPDATED, data);

        messagingTemplate.convertAndSend(WebSocketTopics.STOCKS_PRICES, envelope);
        log.info("Hisse fiyat broadcast'i yayınlandı. snapshotCount={}", event.snapshots().size());
    }

    private Map<String, Object> toPayload(StockPriceSnapshot snapshot) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("stockId", snapshot.getStock() != null ? snapshot.getStock().getId() : null);
        payload.put("price", snapshot.getPrice());
        payload.put("change", snapshot.getChange());
        payload.put("changePercent", snapshot.getChangePercent());
        payload.put("dayHigh", snapshot.getDayHigh());
        payload.put("dayLow", snapshot.getDayLow());
        payload.put("volume", snapshot.getVolume());
        payload.put("fetchedAt", snapshot.getFetchedAt());
        return payload;
    }
}
