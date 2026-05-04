package com.alper.backend.portfolio.mapper;

import com.alper.backend.portfolio.dto.TradeRequest;
import com.alper.backend.portfolio.dto.TradeResponse;
import com.alper.backend.portfolio.model.OrderType;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionStatus;
import org.springframework.stereotype.Component;

@Component
public class TradeMapper {

    /**
     * TradeRequest → yeni TradeTransaction entity.
     * Status PENDING ile başlar; bond market order durumunda servis katmanı sonradan APPROVED'a çekebilir.
     */
    public TradeTransaction toEntity(TradeRequest request, Long portfolioId) {
        return TradeTransaction.builder()
                .portfolioId(portfolioId)
                .instrumentType(request.instrumentType())
                .instrumentId(request.instrumentId())
                .transactionType(request.transactionType())
                .orderType(request.orderType() == null ? OrderType.LIMIT : request.orderType())
                .quantity(request.quantity())
                .targetPrice(request.targetPrice())
                .status(TransactionStatus.PENDING)
                .build();
    }

    public TradeResponse toResponse(TradeTransaction transaction) {
        return TradeResponse.builder()
                .id(transaction.getId())
                .portfolioId(transaction.getPortfolioId())
                .instrumentType(transaction.getInstrumentType())
                .instrumentId(transaction.getInstrumentId())
                .transactionType(transaction.getTransactionType())
                .orderType(transaction.getOrderType())
                .quantity(transaction.getQuantity())
                .targetPrice(transaction.getTargetPrice())
                .executedPrice(transaction.getExecutedPrice())
                .totalAmount(transaction.getTotalAmount())
                .realizedProfitLoss(transaction.getRealizedProfitLoss())
                .status(transaction.getStatus())
                .rejectionReason(transaction.getRejectionReason())
                .processedAt(transaction.getProcessedAt())
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    public TradeResponse toResponse(TradeTransaction transaction, String instrumentSymbol, String instrumentName) {
        return TradeResponse.builder()
                .id(transaction.getId())
                .portfolioId(transaction.getPortfolioId())
                .instrumentType(transaction.getInstrumentType())
                .instrumentId(transaction.getInstrumentId())
                .instrumentSymbol(instrumentSymbol)
                .instrumentName(instrumentName)
                .transactionType(transaction.getTransactionType())
                .orderType(transaction.getOrderType())
                .quantity(transaction.getQuantity())
                .targetPrice(transaction.getTargetPrice())
                .executedPrice(transaction.getExecutedPrice())
                .totalAmount(transaction.getTotalAmount())
                .realizedProfitLoss(transaction.getRealizedProfitLoss())
                .status(transaction.getStatus())
                .rejectionReason(transaction.getRejectionReason())
                .processedAt(transaction.getProcessedAt())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}
