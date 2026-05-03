package com.alper.backend.market.fx.event;

import com.alper.backend.market.fx.model.ExchangeRate;

import java.time.Instant;
import java.util.List;

/**
 * FxJob TCMB'den yeni kur verileri çektiğinde yayınlanır.
 * FxRateBroadcaster bu event'i dinleyip /topic/market/fx/rates üzerinden full push yapar.
 */
public record FxRatesUpdatedEvent(
        List<ExchangeRate> rates,
        Instant fetchedAt
) {
    public static FxRatesUpdatedEvent of(List<ExchangeRate> rates) {
        return new FxRatesUpdatedEvent(rates, Instant.now());
    }
}