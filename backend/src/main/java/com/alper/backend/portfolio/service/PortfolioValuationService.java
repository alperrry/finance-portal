package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.dto.PortfolioItemResponse;
import com.alper.backend.portfolio.model.PortfolioItem;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Portföy değerleme servisi.
 *
 * <p>Görevler:</p>
 * <ul>
 *     <li>Her PortfolioItem için güncel fiyatı InstrumentPriceResolverService üzerinden çekmek</li>
 *     <li>Native currency'deki değerleri portföyün display currency'sine çevirmek</li>
 *     <li>Average Cost yöntemiyle P/L (mutlak ve yüzde) hesaplamak</li>
 *     <li>Sonuçları Redis'te 60 saniye cache'lemek</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class PortfolioValuationService {

    private static final int RESULT_SCALE = 2;

    private final PortfolioItemRepository portfolioItemRepository;
    private final CurrencyConverterService currencyConverterService;
    private final MarketQuoteService marketQuoteService;
    private final InstrumentPriceResolverService instrumentPriceResolverService;

    /**
     * Portföyün tüm pozisyonlarını ve toplam değerlemesini hesaplar.
     * Sonuç 60 saniye boyunca Redis'te cache'lenir.
     */
    @Cacheable(value = "portfolioValuation", key = "#portfolioId")
    public ValuationResult valuate(Long portfolioId, String displayCurrency) {
        log.debug("Portföy değerlemesi başladı. portfolioId={}", portfolioId);

        List<PortfolioItem> items = portfolioItemRepository.findAllByPortfolioId(portfolioId);
        List<PortfolioItemResponse> itemResponses = new ArrayList<>(items.size());

        BigDecimal totalValue = BigDecimal.ZERO;
        BigDecimal totalCostBasis = BigDecimal.ZERO;

        for (PortfolioItem item : items) {
            ItemValuation valuation = valuateItem(item, displayCurrency);
            itemResponses.add(valuation.response());
            if (valuation.currentValueInDisplayCurrency() != null) {
                totalValue = totalValue.add(valuation.currentValueInDisplayCurrency());
            }
            if (valuation.costBasisInDisplayCurrency() != null) {
                totalCostBasis = totalCostBasis.add(valuation.costBasisInDisplayCurrency());
            }
        }

        BigDecimal totalProfitLoss = totalValue.subtract(totalCostBasis).setScale(RESULT_SCALE, RoundingMode.HALF_UP);
        BigDecimal totalProfitLossPct = computePct(totalProfitLoss, totalCostBasis);

        return ValuationResult.builder()
                .items(itemResponses)
                .totalValue(totalValue.setScale(RESULT_SCALE, RoundingMode.HALF_UP))
                .totalCostBasis(totalCostBasis.setScale(RESULT_SCALE, RoundingMode.HALF_UP))
                .totalProfitLoss(totalProfitLoss)
                .totalProfitLossPct(totalProfitLossPct)
                .build();
    }

    private ItemValuation valuateItem(PortfolioItem item, String displayCurrency) {
        InstrumentType type = item.getInstrumentType();
        InstrumentPriceResolverService.InstrumentInfo info =
                instrumentPriceResolverService.resolve(type, item.getInstrumentId());

        MarketQuoteService.MarketPriceQuote quote = marketQuoteService
                .getQuote(type, item.getInstrumentId())
                .orElse(null);

        BigDecimal currentPriceNative = info != null ? info.currentPrice() : null;
        BigDecimal currentValueDisplay = null;
        BigDecimal costBasisDisplay = null;
        BigDecimal profitLossDisplay = null;
        BigDecimal profitLossPct = null;

        if (currentPriceNative != null && info != null) {
            BigDecimal currentValueNative = currentPriceNative.multiply(item.getQuantity());
            BigDecimal costBasisNative = item.getAvgCost().multiply(item.getQuantity());

            currentValueDisplay = currencyConverterService
                    .convert(currentValueNative, info.nativeCurrency(), displayCurrency)
                    .orElse(null);
            costBasisDisplay = currencyConverterService
                    .convert(costBasisNative, info.nativeCurrency(), displayCurrency)
                    .orElse(null);

            if (currentValueDisplay != null && costBasisDisplay != null) {
                profitLossDisplay = currentValueDisplay.subtract(costBasisDisplay)
                        .setScale(RESULT_SCALE, RoundingMode.HALF_UP);
                profitLossPct = computePct(profitLossDisplay, costBasisDisplay);
            }
        } else {
            log.warn("Güncel fiyat bulunamadı, pozisyon değerlenemiyor. instrumentType={}, instrumentId={}",
                    type, item.getInstrumentId());
        }

        String symbol = info != null ? info.symbol() : null;
        String name = info != null ? info.name() : null;

        PortfolioItemResponse response = PortfolioItemResponse.builder()
                .id(item.getId())
                .instrumentType(type)
                .instrumentId(item.getInstrumentId())
                .instrumentSymbol(symbol)
                .instrumentName(name)
                .quantity(item.getQuantity())
                .avgCost(item.getAvgCost())
                .currentPrice(currentPriceNative)
                .currentValue(currentValueDisplay)
                .marketValue(currentValueDisplay)
                .profitLoss(profitLossDisplay)
                .profitLossPct(profitLossPct)
                .profitLossPercentage(profitLossPct)
                .dailyChange(quote != null ? quote.dailyChange() : null)
                .dailyChangePercentage(quote != null ? quote.dailyChangePercentage() : null)
                .priceTrend(quote != null ? quote.priceTrend() : List.of())
                .nativeCurrency(info != null ? info.nativeCurrency() : null)
                .build();

        return new ItemValuation(response, currentValueDisplay, costBasisDisplay);
    }

    private BigDecimal computePct(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return numerator
                .multiply(BigDecimal.valueOf(100))
                .divide(denominator, RESULT_SCALE, RoundingMode.HALF_UP);
    }

    @Builder
    public record ValuationResult(
            List<PortfolioItemResponse> items,
            BigDecimal totalValue,
            BigDecimal totalCostBasis,
            BigDecimal totalProfitLoss,
            BigDecimal totalProfitLossPct
    ) implements Serializable {
        private static final long serialVersionUID = 1L;
    }

    private record ItemValuation(
            PortfolioItemResponse response,
            BigDecimal currentValueInDisplayCurrency,
            BigDecimal costBasisInDisplayCurrency
    ) {
    }
}
