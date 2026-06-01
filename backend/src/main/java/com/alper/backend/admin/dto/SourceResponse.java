package com.alper.backend.admin.dto;

import lombok.Builder;
import java.time.Instant;

/**
 * Haber kaynağı verilerini API yanıtı olarak döndürür.
 */
@Builder
public record SourceResponse(
        Long id,
        String name,
        String sourceUrl,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}