package com.alper.backend.admin.dto;

import com.alper.backend.news.model.NewsStatus;
import jakarta.validation.constraints.NotNull;

public record AdminNewsStatusRequest(
        @NotNull(message = "Durum boş bırakılamaz.")
        NewsStatus status
) {
}