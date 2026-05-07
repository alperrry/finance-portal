package com.alper.backend.admin.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record AdminNewsCategoryRequest(
        @NotEmpty(message = "En az bir kategori seçilmelidir.")
        Set<Long> categoryIds
) {
}