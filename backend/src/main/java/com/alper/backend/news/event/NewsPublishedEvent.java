package com.alper.backend.news.event;

import java.time.Instant;
import java.util.List;

/**
 * NewsFetcherScheduler yeni haber publish ettiğinde yayınlanır.
 * NewsBroadcaster bu event'i dinleyip /topic/news üzerinden thin push yapar
 * (sadece newsId ve categoryId listesi; içerik REST'ten çekilir).
 */
public record NewsPublishedEvent(
        List<Long> newsIds,
        List<Long> categoryIds,
        Instant occurredAt
) {
    public static NewsPublishedEvent of(List<Long> newsIds, List<Long> categoryIds) {
        return new NewsPublishedEvent(newsIds, categoryIds, Instant.now());
    }
}