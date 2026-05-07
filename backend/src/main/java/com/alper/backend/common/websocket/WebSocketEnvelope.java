package com.alper.backend.common.websocket;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;


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