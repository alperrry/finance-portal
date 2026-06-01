package com.alper.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * TOTP doğrulama isteğini; tek kullanımlık şifreyi taşır.
 */
public record OtpVerifyRequest(
        @NotBlank
        @Pattern(regexp = "\\d{6}", message = "Kod 6 haneli olmalidir.")
        String code
) {
}
