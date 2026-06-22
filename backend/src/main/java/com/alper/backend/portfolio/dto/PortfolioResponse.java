package com.alper.backend.portfolio.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Portföy özetini; adını, değerini ve performansını döndürür.
 */
@Builder
@Schema(description = "Portföy detay yanıtı (özet listede items boş döner)")
public record PortfolioResponse(

        @Schema(description = "Portföy ID", example = "1")
        Long id,

        @Schema(description = "Portföy adı", example = "Uzun Vadeli Yatırım")
        String name,

        @Schema(description = "Görüntüleme para birimi", example = "TRY")
        String displayCurrency,

        @Schema(description = "Toplam portföy değeri (sadece pozisyonlar, display currency)", example = "5230.00")
        BigDecimal totalValue,

        @Schema(description = "Toplam maliyet (sadece items)", example = "4850.00")
        BigDecimal totalCostBasis,

        @Schema(description = "Toplam kâr/zarar (sadece items, display currency)", example = "380.00")
        BigDecimal totalProfitLoss,

        @Schema(description = "Toplam kâr/zarar yüzdesi", example = "7.84")
        BigDecimal totalProfitLossPct,

        @Schema(description = "Açık manuel pozisyon sayısı (özet listede null)", example = "3")
        Integer openPositionCount,

        @Schema(description = "Portföydeki pozisyonlar (özet listede boş)")
        List<PortfolioItemResponse> items,

        @Schema(description = "Oluşturma zamanı")
        Instant createdAt,

        @Schema(description = "Son güncelleme zamanı")
        Instant updatedAt
) {
}
