package com.alper.backend.news.event;

import java.time.Instant;
import java.util.List;


/**
 * Yeni haberler kaydedilip yayınlandığında fırlatılan uygulama olayı.
 *
 * <p>WebSocket üzerinden istemcilere haber bildirimi göndermek için dinlenir.</p>
 *
 * @param newsIds     yayınlanan haberlerin kimlikleri
 * @param categoryIds haberlerin ait olduğu kategori kimlikleri
 * @param occurredAt  olayın oluşma anı
 */
public record NewsPublishedEvent(
        List<Long> newsIds,
        List<Long> categoryIds,
        Instant occurredAt
) {
    /**
     * Oluşma zamanı "şimdi" olan bir olay oluşturur.
     *
     * @param newsIds     yayınlanan haber kimlikleri
     * @param categoryIds ilgili kategori kimlikleri
     * @return oluşturulan olay
     */
    public static NewsPublishedEvent of(List<Long> newsIds, List<Long> categoryIds) {
        return new NewsPublishedEvent(newsIds, categoryIds, Instant.now());
    }
}