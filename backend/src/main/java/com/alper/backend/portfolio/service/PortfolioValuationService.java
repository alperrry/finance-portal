package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
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
import java.util.Optional;

/**
 * Portföy değerleme servisi.
 *
 * <p>Görevler:
 * <ul>
 *     <li>Her PortfolioItem için güncel fiyatı ilgili market modülünden çekmek</li>
 *     <li>Native currency'deki değerleri portföyün display currency'sine çevirmek</li>
 *     <li>Average Cost yöntemiyle P/L (mutlak ve yüzde) hesaplamak</li>
 *     <li>Sonuçları Redis'te 60 saniye cache'lemek</li>
 * </ul>
 * </p>
 *
 * <p>NOT: Kullanılan repository metodları (mevcut değilse eklenmeli):
 * <pre>
 * StockPriceSnapshotRepository.findFirstByStockIdOrderByFetchedAtDesc(Long stockId);
 * StockPriceHistoryRepository.findFirstByStockIdOrderByTradeDateDesc(Long stockId);
 * FundPriceRepository.findFirstByFundIdOrderByPriceDateDesc(Long fundId);
 * ExchangeRateRepository.findFirstByIdOrderByRateDateDesc(Long id);
 * BondRateHistoryRepository.findFirstByBondIdOrderByRateDateDesc(Long bondId);
 * </pre>
 * </p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class PortfolioValuationService {

    private static final BigDecimal BOND_NOMINAL_VALUE = new BigDecimal("100");
    private static final int RESULT_SCALE = 2;

    private final PortfolioItemRepository portfolioItemRepository;
    private final CurrencyConverterService currencyConverterService;

    private final StockRepository stockRepository;
    private final StockPriceSnapshotRepository stockPriceSnapshotRepository;
    private final StockPriceHistoryRepository stockPriceHistoryRepository;

    private final FundRepository fundRepository;
    private final FundPriceRepository fundPriceRepository;

    private final ExchangeRateRepository exchangeRateRepository;

    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;

    /**
     * Portföyün tüm pozisyonlarını ve toplam değerlemesini hesaplar.
     * Sonuç 60 saniye boyunca Redis'te cache'lenir; trade APPROVED/REJECTED/CANCELLED
     * sonrası TradeNotificationService tarafından @CacheEvict ile invalidate edilir.
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
        InstrumentInfo info = resolveInstrumentInfo(type, item.getInstrumentId());

        BigDecimal currentPriceNative = info.currentPrice();
        BigDecimal currentValueDisplay = null;
        BigDecimal costBasisDisplay = null;
        BigDecimal profitLossDisplay = null;
        BigDecimal profitLossPct = null;

        if (currentPriceNative != null) {
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

        PortfolioItemResponse response = PortfolioItemResponse.builder()
                .id(item.getId())
                .instrumentType(type)
                .instrumentId(item.getInstrumentId())
                .instrumentSymbol(info.symbol())
                .instrumentName(info.name())
                .quantity(item.getQuantity())
                .avgCost(item.getAvgCost())
                .currentPrice(currentPriceNative)
                .currentValue(currentValueDisplay)
                .profitLoss(profitLossDisplay)
                .profitLossPct(profitLossPct)
                .nativeCurrency(info.nativeCurrency())
                .build();

        return new ItemValuation(response, currentValueDisplay, costBasisDisplay);
    }

    private InstrumentInfo resolveInstrumentInfo(InstrumentType type, Long instrumentId) {
        return switch (type) {
            case STOCK -> resolveStock(instrumentId);
            case FUND -> resolveFund(instrumentId);
            case CURRENCY -> resolveFx(instrumentId);
            case BOND -> resolveBond(instrumentId);
            case VIOP -> null;
        };
    }

    private InstrumentInfo resolveStock(Long stockId) {
        Stock stock = stockRepository.findById(stockId).orElse(null);
        BigDecimal currentPrice = stockPriceSnapshotRepository
                .findFirstByStockIdOrderByFetchedAtDesc(stockId)
                .map(StockPriceSnapshot::getPrice)
                .orElseGet(() -> stockPriceHistoryRepository
                        .findFirstByStockIdOrderByTradeDateDesc(stockId)
                        .map(history -> history.getClosePrice())
                        .orElse(null));

        String symbol = stock != null ? stock.getSymbol() : null;
        String name = stock != null ? stock.getShortName() : null;
        String currency = stock != null && stock.getCurrency() != null ? stock.getCurrency() : "TRY";
        return new InstrumentInfo(symbol, name, currency, currentPrice);
    }

    private InstrumentInfo resolveFund(Long fundId) {
        Fund fund = fundRepository.findById(fundId).orElse(null);
        BigDecimal currentPrice = fundPriceRepository
                .findFirstByFundIdOrderByPriceDateDesc(fundId)
                .map(p -> p.getPrice())
                .orElse(null);

        String symbol = fund != null ? fund.getCode() : null;
        String name = fund != null ? fund.getName() : null;
        return new InstrumentInfo(symbol, name, "TRY", currentPrice);
    }

    private InstrumentInfo resolveFx(Long exchangeRateId) {
        Optional<ExchangeRate> rateOpt = exchangeRateRepository
                .findFirstByIdOrderByRateDateDesc(exchangeRateId);

        if (rateOpt.isEmpty()) {
            return new InstrumentInfo(null, null, "TRY", null);
        }
        ExchangeRate rate = rateOpt.get();
        return new InstrumentInfo(
                rate.getCurrencyCode(),
                rate.getCurrencyName(),
                "TRY",
                rate.getForexBuying()
        );
    }

    private InstrumentInfo resolveBond(Long bondId) {
        Bond bond = bondRepository.findById(bondId).orElse(null);
        BigDecimal interestRate = bondRateHistoryRepository
                .findFirstByBondIdOrderByRateDateDesc(bondId)
                .map(h -> h.getInterestRate())
                .orElse(null);

        // Bond için fiyat = nominal değer (100). Faiz oranı sadece display amaçlı.
        // Gerçek fiyatlandırma vade hesabı gerektirir; bu sprint için basitleştirildi.
        BigDecimal currentPrice = interestRate != null ? BOND_NOMINAL_VALUE : null;

        String symbol = bond != null ? bond.getEvdsSeriesCode() : null;
        String name = bond != null ? bond.getName() : null;
        String currency = bond != null && bond.getCurrency() != null ? bond.getCurrency() : "TRY";
        return new InstrumentInfo(symbol, name, currency, currentPrice);
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

    private record InstrumentInfo(
            String symbol,
            String name,
            String nativeCurrency,
            BigDecimal currentPrice
    ) {
    }
}
