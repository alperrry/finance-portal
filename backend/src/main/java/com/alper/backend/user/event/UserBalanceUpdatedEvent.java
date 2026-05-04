package com.alper.backend.user.event;

import java.time.Instant;

/**
 * Kullanıcı harcanabilir bakiyesi değiştiğinde thin WebSocket push tetikler.
 */
public record UserBalanceUpdatedEvent(
        Long userId,
        Instant occurredAt
) {
    public static UserBalanceUpdatedEvent of(Long userId) {
        return new UserBalanceUpdatedEvent(userId, Instant.now());
    }
}
