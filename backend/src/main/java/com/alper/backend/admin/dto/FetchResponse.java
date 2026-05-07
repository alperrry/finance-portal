package com.alper.backend.admin.dto;

import java.time.Instant;

public record FetchResponse(
        String source,
        String status,
        String message,
        Instant triggeredAt
) {
    public static FetchResponse triggered(String source) {
        return new FetchResponse(
                source,
                "TRIGGERED",
                source + " için haber çekimi başlatıldı.",
                Instant.now()
        );
    }

    public static FetchResponse alreadyRunning(String source) {
        return new FetchResponse(
                source,
                "ALREADY_RUNNING",
                source + " için haber çekimi zaten çalışıyor.",
                Instant.now()
        );
    }
}