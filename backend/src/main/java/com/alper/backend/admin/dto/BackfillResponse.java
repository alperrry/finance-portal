package com.alper.backend.admin.dto;

import java.time.Instant;

/**
 * Geçmiş veri dolum işleminin sonuç özetini döndürür.
 */
public record BackfillResponse(
        String module,
        String status,
        String message,
        Instant triggeredAt
) {
    public static BackfillResponse triggered(String module) {
        return new BackfillResponse(
                module,
                "TRIGGERED",
                module + " backfill başlatıldı.",
                Instant.now()
        );
    }

    public static BackfillResponse alreadyRunning(String module) {
        return new BackfillResponse(
                module,
                "ALREADY_RUNNING",
                module + " backfill zaten çalışıyor.",
                Instant.now()
        );
    }
}