package com.alper.backend.market.common.event;

import java.time.Instant;
import java.time.LocalDate;

public record MarketDataUpdatedEvent(
        MarketDataModule module,
        int updatedCount,
        LocalDate dataDate,
        Instant fetchedAt
) {
    public static MarketDataUpdatedEvent of(MarketDataModule module, int updatedCount, LocalDate dataDate) {
        return new MarketDataUpdatedEvent(module, updatedCount, dataDate, Instant.now());
    }
}
