package com.alper.backend.admin.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResetUser2FaRequest(
        @NotNull(message = "2FA sıfırlama için gerekçe zorunludur.")
        @Size(min = 10, max = 500, message = "Gerekçe 10-500 karakter arasında olmalıdır.")
        String reason
) {
}
