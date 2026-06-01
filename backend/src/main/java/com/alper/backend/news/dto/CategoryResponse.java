package com.alper.backend.news.dto;

import com.alper.backend.news.model.Category;

/**
 * Haber kategorisi verilerini API yanıtı olarak döndürür.
 */
public record CategoryResponse(Long id, String name) {

    public CategoryResponse(Category category) {
        this(category.getId(), category.getName());
    }
}
