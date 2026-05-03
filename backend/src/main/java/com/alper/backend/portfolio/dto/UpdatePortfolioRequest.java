package com.alper.backend.portfolio.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Portföy güncelleme isteği")
public record UpdatePortfolioRequest(

        @Schema(description = "Yeni portföy adı", example = "Emeklilik Portföyü", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Portföy adı zorunludur")
        @Size(max = 255, message = "Portföy adı en fazla 255 karakter olabilir")
        String name
) {
}