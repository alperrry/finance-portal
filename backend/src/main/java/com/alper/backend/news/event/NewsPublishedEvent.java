package com.alper.backend.news.event;

import java.time.Instant;
import java.util.List;


public record NewsPublishedEvent(
        List<Long> newsIds,
        List<Long> categoryIds,
        Instant occurredAt
) {
    public static NewsPublishedEvent of(List<Long> newsIds, List<Long> categoryIds) {
        return new NewsPublishedEvent(newsIds, categoryIds, Instant.now());
    }
}