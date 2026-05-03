package com.alper.backend.portfolio.event;

import com.alper.backend.portfolio.model.TradeTransaction;

import java.time.Instant;

/**
 * Trade kullanıcı tarafından CANCELLED durumuna geçirildiğinde yayınlanır.
 * AFTER_COMMIT fazında WebSocket bildirimi tetikler.
 */
public record TradeCancelledEvent(
        TradeTransaction transaction,
        Long userId,
        Instant occurredAt
) {
    public static TradeCancelledEvent of(TradeTransaction transaction, Long userId) {
        return new TradeCancelledEvent(transaction, userId, Instant.now());
    }
}