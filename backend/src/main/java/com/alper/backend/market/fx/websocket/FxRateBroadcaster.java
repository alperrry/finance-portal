package com.alper.backend.market.fx.websocket;

import com.alper.backend.common.websocket.WebSocketEnvelope;
import com.alper.backend.common.websocket.WebSocketEventType;
import com.alper.backend.common.websocket.WebSocketTopics;
import com.alper.backend.market.fx.event.FxRatesUpdatedEvent;
import com.alper.backend.market.fx.model.ExchangeRate;
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
 * TCMB döviz kuru güncellemelerini WebSocket üzerinden tüm abonelere yayınlayan listener.
 *
 * <p>Pattern: <strong>full push</strong>. ~20 currency × 100 byte ≈ 2KB.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class FxRateBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRatesUpdated(FxRatesUpdatedEvent event) {
        if (event.rates() == null || event.rates().isEmpty()) {
            log.debug("FxRatesUpdatedEvent boş rate listesi ile geldi, broadcast atlandı");
            return;
        }

        List<Map<String, Object>> ratePayloads = event.rates().stream()
                .map(this::toPayload)
                .toList();

        Map<String, Object> data = new HashMap<>();
        data.put("rates", ratePayloads);
        data.put("fetchedAt", event.fetchedAt());

        WebSocketEnvelope<Object> envelope = WebSocketEnvelope.of(
                WebSocketEventType.FX_RATES_UPDATED, data);

        messagingTemplate.convertAndSend(WebSocketTopics.FX_RATES, envelope);
        log.info("Döviz kuru broadcast'i yayınlandı. rateCount={}", event.rates().size());
    }

    private Map<String, Object> toPayload(ExchangeRate rate) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", rate.getId());
        payload.put("currencyCode", rate.getCurrencyCode());
        payload.put("currencyName", rate.getCurrencyName());
        payload.put("unit", rate.getUnit());
        payload.put("forexBuying", rate.getForexBuying());
        payload.put("forexSelling", rate.getForexSelling());
        payload.put("rateDate", rate.getRateDate());
        return payload;
    }
}