package com.alper.backend.admin.dto;

import com.alper.backend.user.model.UserRole;
import lombok.Builder;

import java.time.Instant;


@Builder
public record AdminUserListResponse(
        Long id,
        String keycloakId,
        String username,
        String email,
        UserRole role,
        boolean active,
        boolean twoFactorEnabled,
        Instant lastLoginAt,
        long portfolioCount,
        Instant createdAt
) {
}