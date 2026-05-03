package com.alper.backend.portfolio.event;

import com.alper.backend.portfolio.model.TradeTransaction;

import java.time.Instant;

/**
 * Trade APPROVED durumuna geçtiğinde yayınlanır.
 * AFTER_COMMIT fazında WebSocket bildirimi tetikler.
 */
public record TradeApprovedEvent(
        TradeTransaction transaction,
        Long userId,
        Instant occurredAt
) {
    public static TradeApprovedEvent of(TradeTransaction transaction, Long userId) {
        return new TradeApprovedEvent(transaction, userId, Instant.now());
    }
}