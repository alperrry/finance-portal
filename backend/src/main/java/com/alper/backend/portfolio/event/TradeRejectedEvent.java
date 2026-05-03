package com.alper.backend.portfolio.event;

import com.alper.backend.portfolio.model.TradeTransaction;

import java.time.Instant;

/**
 * Trade REJECTED durumuna geçtiğinde yayınlanır.
 * AFTER_COMMIT fazında WebSocket bildirimi tetikler.
 */
public record TradeRejectedEvent(
        TradeTransaction transaction,
        Long userId,
        String rejectionReason,
        Instant occurredAt
) {
    public static TradeRejectedEvent of(TradeTransaction transaction, Long userId, String rejectionReason) {
        return new TradeRejectedEvent(transaction, userId, rejectionReason, Instant.now());
    }
}