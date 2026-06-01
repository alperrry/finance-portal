package com.alper.backend.admin.dto;

import com.alper.backend.news.model.NewsStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Admin panelinden bir haberin durum güncellemesini taşır.
 */
public record AdminNewsStatusRequest(
        @NotNull(message = "Durum boş bırakılamaz.")
        NewsStatus status
) {
}