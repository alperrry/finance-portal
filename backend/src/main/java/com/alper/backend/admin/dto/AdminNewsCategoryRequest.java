package com.alper.backend.admin.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

/**
 * Admin panelinden haber kategorisi oluşturma/güncelleme isteğini taşır.
 */
public record AdminNewsCategoryRequest(
        @NotEmpty(message = "En az bir kategori seçilmelidir.")
        Set<Long> categoryIds
) {
}