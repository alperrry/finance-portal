package com.alper.backend.market.stocks.event;

import com.alper.backend.market.stocks.model.StockPriceSnapshot;

import java.time.Instant;
import java.util.List;

/**
 * StockJob Yahoo Finance'den yeni snapshot'lar çektiğinde yayınlanır.
 * StockPriceBroadcaster bu event'i dinleyip /topic/market/stocks/prices üzerinden full push yapar.
 */
public record StockPricesUpdatedEvent(
        List<StockPriceSnapshot> snapshots,
        Instant fetchedAt
) {
    public static StockPricesUpdatedEvent of(List<StockPriceSnapshot> snapshots) {
        return new StockPricesUpdatedEvent(snapshots, Instant.now());
    }
}