package com.alper.backend.portfolio.dto;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.OrderType;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.model.TransactionType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Alış/satış işlemi yanıtı")
public record TradeResponse(

        @Schema(description = "İşlem ID", example = "42")
        Long id,

        @Schema(description = "Portföy ID", example = "1")
        Long portfolioId,

        @Schema(description = "Enstrüman tipi", example = "STOCK")
        InstrumentType instrumentType,

        @Schema(description = "Enstrüman ID", example = "5")
        Long instrumentId,

        @Schema(description = "Enstrüman sembolü", example = "AKBNK.IS")
        String instrumentSymbol,

        @Schema(description = "Enstrüman tam adı", example = "Akbank T.A.Ş.")
        String instrumentName,

        @Schema(description = "İşlem tipi", example = "BUY")
        TransactionType transactionType,

        @Schema(description = "Emir tipi", example = "LIMIT")
        OrderType orderType,

        @Schema(description = "İşlem miktarı", example = "100.000000")
        BigDecimal quantity,

        @Schema(description = "Hedef fiyat (limit)", example = "50.000000")
        BigDecimal targetPrice,

        @Schema(description = "Gerçekleşme fiyatı (APPROVED iken doldurulur)", example = "49.800000")
        BigDecimal executedPrice,

        @Schema(description = "Toplam tutar (quantity * executedPrice)", example = "4980.00")
        BigDecimal totalAmount,

        @Schema(description = "Realized P/L (sadece SELL işlemlerinde)", example = "230.00")
        BigDecimal realizedProfitLoss,

        @Schema(description = "İşlem durumu", example = "APPROVED")
        TransactionStatus status,

        @Schema(description = "Red gerekçesi (REJECTED ise)", example = "Yetersiz pozisyon. Mevcut: 50, talep: 100, beklemede: 0")
        String rejectionReason,

        @Schema(description = "PENDING dışı bir duruma geçiş zamanı")
        Instant processedAt,

        @Schema(description = "Oluşturma zamanı")
        Instant createdAt
) {
}
