package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.viop.model.ViopContractPrice;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Manuel pozisyon değerleme akışında kullanılan, enstrüman bazlı son fiyat (quote) servisi.
 *
 * <p>Stock, fund, bond, fx, viop için ilgili repository'lerden en güncel kapanış/snapshot
 * verisini getirir. {@link InstrumentPriceResolverService}'in tamamlayıcısıdır; closing
 * price'a değil işlem akışı için snapshot'a odaklanır.</p>
 */
@Service
@RequiredArgsConstructor
public class MarketQuoteService {

    private static final BigDecimal BOND_NOMINAL_VALUE = new BigDecimal("100");
    private static final int PRICE_SCALE = 6;
    private static final int TREND_DAYS = 7;

    private final StockPriceHistoryRepository stockPriceHistoryRepository;
    private final FundPriceRepository fundPriceRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;
    private final ViopContractPriceRepository viopContractPriceRepository;

    public Optional<MarketPriceQuote> getQuote(InstrumentType type, Long instrumentId) {
        return switch (type) {
            case STOCK -> getStockQuote(instrumentId);
            case FUND -> getFundQuote(instrumentId);
            case CURRENCY -> getFxQuote(instrumentId);
            case BOND -> getBondQuote(instrumentId);
            case VIOP -> getViopQuote(instrumentId);
            case DEPOSIT -> Optional.empty();
        };
    }

    private Optional<MarketPriceQuote> getStockQuote(Long stockId) {
        List<StockPriceHistory> desc = stockPriceHistoryRepository
                .findTop8ByStockIdOrderByTradeDateDesc(stockId);
        if (desc.size() < 2) return Optional.empty();
        List<BigDecimal> prices = desc.stream()
                .sorted(Comparator.comparing(StockPriceHistory::getTradeDate))
                .map(StockPriceHistory::getClosePrice)
                .filter(Objects::nonNull)
                .toList();
        return buildQuoteFromPrices(prices);
    }

    private Optional<MarketPriceQuote> getFundQuote(Long fundId) {
        List<FundPrice> desc = fundPriceRepository
                .findTop8ByFundIdOrderByPriceDateDesc(fundId);
        if (desc.size() < 2) return Optional.empty();
        List<BigDecimal> prices = desc.stream()
                .sorted(Comparator.comparing(FundPrice::getPriceDate))
                .map(FundPrice::getPrice)
                .filter(Objects::nonNull)
                .toList();
        return buildQuoteFromPrices(prices);
    }

    private Optional<MarketPriceQuote> getFxQuote(Long exchangeRateId) {
        String currencyCode = exchangeRateRepository.findById(exchangeRateId)
                .map(ExchangeRate::getCurrencyCode)
                .orElse(null);
        if (currencyCode == null) return Optional.empty();
        List<ExchangeRate> desc = exchangeRateRepository
                .findTop8ByCurrencyCodeOrderByRateDateDesc(currencyCode);
        if (desc.size() < 2) return Optional.empty();
        List<BigDecimal> prices = desc.stream()
                .sorted(Comparator.comparing(ExchangeRate::getRateDate))
                .map(ExchangeRate::getForexBuying)
                .filter(Objects::nonNull)
                .toList();
        return buildQuoteFromPrices(prices);
    }

    private Optional<MarketPriceQuote> getBondQuote(Long bondId) {
        boolean bondExists = bondRepository.existsById(bondId);
        boolean hasHistory = bondRateHistoryRepository.findFirstByBondIdOrderByRateDateDesc(bondId).isPresent();
        if (!bondExists && !hasHistory) return Optional.empty();
        List<BigDecimal> trend = Collections.nCopies(TREND_DAYS, BOND_NOMINAL_VALUE);
        return Optional.of(new MarketPriceQuote(BOND_NOMINAL_VALUE, BigDecimal.ZERO, BigDecimal.ZERO, trend));
    }

    private Optional<MarketPriceQuote> getViopQuote(Long contractId) {
        ViopContractPrice original = viopContractPriceRepository.findById(contractId).orElse(null);
        if (original == null) return Optional.empty();
        ViopContractPrice latest = viopContractPriceRepository
                .findFirstByMarketSegmentAndContractNameOrderByTradeDateDesc(
                        original.getMarketSegment(), original.getContractName())
                .orElse(original);
        if (latest == null || latest.getLastPrice() == null) return Optional.empty();
        List<ViopContractPrice> desc = viopContractPriceRepository
                .findTop8ByContractNameOrderByTradeDateDesc(latest.getContractName());
        List<BigDecimal> trend = desc.stream()
                .sorted(Comparator.comparing(ViopContractPrice::getTradeDate))
                .map(ViopContractPrice::getLastPrice)
                .filter(Objects::nonNull)
                .toList();
        BigDecimal changeAmount = latest.getChangeAmount() != null ? latest.getChangeAmount() : BigDecimal.ZERO;
        BigDecimal changePercent = latest.getChangePercent() != null ? latest.getChangePercent() : BigDecimal.ZERO;
        return Optional.of(new MarketPriceQuote(
                latest.getLastPrice().setScale(PRICE_SCALE, RoundingMode.HALF_UP),
                changeAmount,
                changePercent,
                trend));
    }

    private Optional<MarketPriceQuote> buildQuoteFromPrices(List<BigDecimal> prices) {
        if (prices.size() < 2) return Optional.empty();
        BigDecimal today = prices.get(prices.size() - 1);
        BigDecimal yesterday = prices.get(prices.size() - 2);
        if (yesterday.compareTo(BigDecimal.ZERO) == 0) {
            return Optional.of(new MarketPriceQuote(
                    today.setScale(PRICE_SCALE, RoundingMode.HALF_UP),
                    BigDecimal.ZERO, BigDecimal.ZERO, prices));
        }
        BigDecimal dailyChange = today.subtract(yesterday).setScale(PRICE_SCALE, RoundingMode.HALF_UP);
        BigDecimal dailyChangePct = dailyChange.multiply(BigDecimal.valueOf(100))
                .divide(yesterday, 2, RoundingMode.HALF_UP);
        return Optional.of(new MarketPriceQuote(
                today.setScale(PRICE_SCALE, RoundingMode.HALF_UP),
                dailyChange,
                dailyChangePct,
                prices));
    }

    public record MarketPriceQuote(
            BigDecimal currentPrice,
            BigDecimal dailyChange,
            BigDecimal dailyChangePercentage,
            List<BigDecimal> priceTrend
    ) {}
}
