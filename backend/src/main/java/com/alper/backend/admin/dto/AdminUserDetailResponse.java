package com.alper.backend.admin.dto;

import com.alper.backend.user.model.UserRole;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;


/**
 * Admin panelinde tek bir kullanıcının ayrıntılı profilini döndürür.
 */
@Builder
public record AdminUserDetailResponse(
        Long id,
        String keycloakId,
        String username,
        String email,
        String firstName,
        String lastName,
        UserRole role,
        boolean active,
        boolean twoFactorEnabled,
        Instant lastLoginAt,
        long portfolioCount,
        BigDecimal totalPortfolioValue,
        Instant createdAt,
        Instant updatedAt
) {
}