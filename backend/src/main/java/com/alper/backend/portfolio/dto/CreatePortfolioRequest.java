package com.alper.backend.portfolio.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Yeni portföy oluşturma isteğini; adını ve para birimini içerir.
 */
@Schema(description = "Yeni portföy oluşturma isteği")
public record CreatePortfolioRequest(

        @Schema(description = "Portföy adı", example = "Uzun Vadeli Yatırım", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Portföy adı zorunludur")
        @Size(max = 255, message = "Portföy adı en fazla 255 karakter olabilir")
        String name,

        @Schema(description = "Görüntüleme para birimi (ISO 4217). Boş bırakılırsa TRY varsayılır.", example = "TRY", allowableValues = {"TRY", "USD", "EUR"})
        @Pattern(regexp = "^[A-Z]{3}$", message = "Para birimi 3 harfli ISO 4217 kodu olmalıdır")
        String displayCurrency
) {
}