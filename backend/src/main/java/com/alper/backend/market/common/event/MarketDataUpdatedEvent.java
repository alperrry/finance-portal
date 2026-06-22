package com.alper.backend.market.common.event;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Bir piyasa modülünün verisi güncellendiğinde yayınlanan uygulama olayı.
 *
 * <p>Transaction commit sonrası dinlenir ve güncelleme WebSocket üzerinden
 * istemcilere duyurulur.</p>
 *
 * @param module       veriyi güncelleyen piyasa modülü
 * @param updatedCount güncellenen kayıt sayısı
 * @param dataDate     verinin ait olduğu tarih
 * @param fetchedAt    verinin çekildiği an
 */
public record MarketDataUpdatedEvent(
        MarketDataModule module,
        int updatedCount,
        LocalDate dataDate,
        Instant fetchedAt
) {
    /**
     * Çekilme zamanı "şimdi" olan bir olay oluşturur.
     *
     * @param module       veriyi güncelleyen modül
     * @param updatedCount güncellenen kayıt sayısı
     * @param dataDate     verinin ait olduğu tarih
     * @return oluşturulan olay
     */
    public static MarketDataUpdatedEvent of(MarketDataModule module, int updatedCount, LocalDate dataDate) {
        return new MarketDataUpdatedEvent(module, updatedCount, dataDate, Instant.now());
    }
}
