package com.alper.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

/**
 * Haber kaynağı oluşturma veya güncelleme isteğini taşır.
 */
public record SourceRequest(
        @NotBlank(message = "Kaynak adı boş bırakılamaz.")
        String name,

        @NotBlank(message = "RSS URL boş bırakılamaz.")
        @URL(message = "Geçerli bir URL giriniz.")
        String sourceUrl
) {
}