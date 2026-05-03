package com.alper.backend.common.websocket;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * Tüm WebSocket mesajları için generic envelope.
 * Frontend'de tek bir parser ile event tipi belirlenip data alanı ilgili shape'e cast edilir.
 *
 * <p>Thin push örneği:
 * <pre>{ "type": "TRADE_APPROVED", "data": { "transactionId": 42, "portfolioId": 1 }, "timestamp": "..." }</pre></p>
 *
 * <p>Full push örneği:
 * <pre>{ "type": "STOCK_PRICES_UPDATED", "data": { "snapshots": [...] }, "timestamp": "..." }</pre></p>
 */
@Schema(description = "WebSocket üzerinden iletilen tüm mesajların ortak yapısı")
public record WebSocketEnvelope<T>(

        @Schema(description = "Event tipi", example = "TRADE_APPROVED")
        WebSocketEventType type,

        @Schema(description = "Event'e özgü payload (thin veya full)")
        T data,

        @Schema(description = "Mesajın yayınlanma zamanı")
        Instant timestamp
) {
    public static <T> WebSocketEnvelope<T> of(WebSocketEventType type, T data) {
        return new WebSocketEnvelope<>(type, data, Instant.now());
    }
}