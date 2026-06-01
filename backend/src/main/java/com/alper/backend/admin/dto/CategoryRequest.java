package com.alper.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Kategori oluşturma veya güncelleme isteğini taşır.
 */
public class CategoryRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private Boolean isActive;

    public CategoryRequest() {}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}
