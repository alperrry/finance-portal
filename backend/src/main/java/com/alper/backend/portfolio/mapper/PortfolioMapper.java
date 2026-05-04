package com.alper.backend.portfolio.mapper;

import com.alper.backend.portfolio.dto.CreatePortfolioRequest;
import com.alper.backend.portfolio.dto.PortfolioItemResponse;
import com.alper.backend.portfolio.dto.PortfolioResponse;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PortfolioItem;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

@Component
public class PortfolioMapper {

    private static final String DEFAULT_CURRENCY = "TRY";

    /**
     * CreatePortfolioRequest → yeni Portfolio entity (henüz persist edilmemiş).
     */
    public Portfolio toEntity(CreatePortfolioRequest request, Long userId) {
        String currency = (request.displayCurrency() == null || request.displayCurrency().isBlank())
                ? DEFAULT_CURRENCY
                : request.displayCurrency();

        return Portfolio.builder()
                .userId(userId)
                .name(request.name())
                .displayCurrency(currency)
                .build();
    }

    /**
     * Liste / özet görünümü için: items boş, valuation alanları null.
     */
    public PortfolioResponse toSummaryResponse(Portfolio portfolio) {
        return PortfolioResponse.builder()
                .id(portfolio.getId())
                .name(portfolio.getName())
                .displayCurrency(portfolio.getDisplayCurrency())
                .totalValue(null)
                .totalCostBasis(null)
                .totalProfitLoss(null)
                .totalProfitLossPct(null)
                .items(Collections.emptyList())
                .createdAt(portfolio.getCreatedAt())
                .updatedAt(portfolio.getUpdatedAt())
                .build();
    }

    /**
     * Detay görünümü için: items + valuation dolu.
     * PortfolioValuationService tarafından zenginleştirilmiş veriler ile çağrılır.
     */
    public PortfolioResponse toDetailResponse(
            Portfolio portfolio,
            List<PortfolioItemResponse> items,
            BigDecimal totalValue,
            BigDecimal totalCostBasis,
            BigDecimal totalProfitLoss,
            BigDecimal totalProfitLossPct
    ) {
        return PortfolioResponse.builder()
                .id(portfolio.getId())
                .name(portfolio.getName())
                .displayCurrency(portfolio.getDisplayCurrency())
                .totalValue(totalValue)
                .totalCostBasis(totalCostBasis)
                .totalProfitLoss(totalProfitLoss)
                .totalProfitLossPct(totalProfitLossPct)
                .items(items)
                .createdAt(portfolio.getCreatedAt())
                .updatedAt(portfolio.getUpdatedAt())
                .build();
    }

    /**
     * PortfolioItem entity'sinden valuation bilgileri henüz hesaplanmadan temel response.
     * Güncel fiyat ve P/L alanları PortfolioValuationService tarafından doldurulur.
     */
    public PortfolioItemResponse toItemBaseResponse(PortfolioItem item) {
        return PortfolioItemResponse.builder()
                .id(item.getId())
                .instrumentType(item.getInstrumentType())
                .instrumentId(item.getInstrumentId())
                .quantity(item.getQuantity())
                .avgCost(item.getAvgCost())
                .build();
    }
}
