package com.alper.backend.portfolio.dto;

import com.alper.backend.common.model.InstrumentType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.io.Serializable;
import java.math.BigDecimal;

@Builder
@Schema(description = "Portföydeki tek bir enstrüman pozisyonu (güncel değer ve P/L dahil)")
public record PortfolioItemResponse(

        @Schema(description = "Pozisyon ID", example = "42")
        Long id,

        @Schema(description = "Enstrüman tipi", example = "STOCK")
        InstrumentType instrumentType,

        @Schema(description = "İlgili enstrüman tablosundaki kayıt ID'si", example = "5")
        Long instrumentId,

        @Schema(description = "Enstrüman sembolü", example = "AKBNK.IS")
        String instrumentSymbol,

        @Schema(description = "Enstrüman tam adı", example = "Akbank T.A.Ş.")
        String instrumentName,

        @Schema(description = "Sahip olunan miktar", example = "100.000000")
        BigDecimal quantity,

        @Schema(description = "Ortalama maliyet (Average Cost)", example = "48.500000")
        BigDecimal avgCost,

        @Schema(description = "Güncel piyasa fiyatı (native currency)", example = "52.300000")
        BigDecimal currentPrice,

        @Schema(description = "Güncel pozisyon değeri (display currency)", example = "5230.00")
        BigDecimal currentValue,

        @Schema(description = "Kâr/Zarar (display currency)", example = "380.00")
        BigDecimal profitLoss,

        @Schema(description = "Kâr/Zarar yüzdesi", example = "7.84")
        BigDecimal profitLossPct,

        @Schema(description = "Enstrümanın doğal para birimi", example = "TRY")
        String nativeCurrency
) implements Serializable {
        private static final long serialVersionUID = 1L;
}
