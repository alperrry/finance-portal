package com.alper.backend.common.websocket;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;


/**
 * WebSocket üzerinden iletilen tüm mesajların ortak zarf yapısı.
 *
 * @param <T>       event'e özgü payload tipi
 * @param type      event tipi
 * @param data      event'e özgü payload
 * @param timestamp mesajın yayınlanma zamanı
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
    /**
     * Yayın zamanı "şimdi" olan bir zarf oluşturur.
     *
     * @param type event tipi
     * @param data event payload'u
     * @param <T>  payload tipi
     * @return oluşturulan zarf
     */
    public static <T> WebSocketEnvelope<T> of(WebSocketEventType type, T data) {
        return new WebSocketEnvelope<>(type, data, Instant.now());
    }
}