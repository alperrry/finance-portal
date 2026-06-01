package com.alper.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Kullanıcının kendi şifresini değiştirme isteğini taşır.
 */
public record ChangePasswordRequest(
        @NotBlank
        @Size(min = 8, max = 128)
        String newPassword
) {
}
