package com.alper.backend.portfolio.dto;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.TransactionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

@Schema(description = "Alış/satış (limit order) talebi")
public record TradeRequest(

        @Schema(description = "Enstrüman tipi", example = "STOCK", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Enstrüman tipi zorunludur")
        InstrumentType instrumentType,

        @Schema(description = "İlgili enstrüman tablosundaki kayıt ID'si", example = "5", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Enstrüman ID zorunludur")
        Long instrumentId,

        @Schema(description = "İşlem tipi (BUY/SELL)", example = "BUY", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "İşlem tipi zorunludur")
        TransactionType transactionType,

        @Schema(description = "İşlem miktarı (lot/adet)", example = "100", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Miktar zorunludur")
        @DecimalMin(value = "0.000001", message = "Miktar 0'dan büyük olmalıdır")
        BigDecimal quantity,

        @Schema(description = "Hedef fiyat (limit). Enstrüman bu fiyat şartını sağladığında işlem tetiklenir.", example = "50.00", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Hedef fiyat zorunludur")
        @DecimalMin(value = "0.000001", message = "Hedef fiyat 0'dan büyük olmalıdır")
        BigDecimal targetPrice
) {
}