package com.alper.backend.market.common.event;

/**
 * Piyasa verisi güncelleme olaylarının ({@link MarketDataUpdatedEvent}) kaynak modülleri.
 */
public enum MarketDataModule {
    STOCKS,
    FUNDS,
    VIOP,
    BONDS
}
