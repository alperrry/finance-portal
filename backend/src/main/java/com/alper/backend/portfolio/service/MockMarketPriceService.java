package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MockMarketPriceService {

    private static final BigDecimal BOND_NOMINAL_VALUE = new BigDecimal("100");
    private static final int PRICE_SCALE = 6;
    private static final int TREND_DAYS = 7;

    private final StockRepository stockRepository;
    private final StockPriceHistoryRepository stockPriceHistoryRepository;
    private final FundPriceRepository fundPriceRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;

    public Optional<MarketPriceQuote> getQuote(InstrumentType type, Long instrumentId) {
        return switch (type) {
            case STOCK -> getStockQuote(instrumentId);
            case FUND -> fundPriceRepository.findFirstByFundIdOrderByPriceDateDesc(instrumentId)
                    .map(price -> buildQuote(type, instrumentId, price.getPrice()));
            case CURRENCY -> exchangeRateRepository.findFirstByIdOrderByRateDateDesc(instrumentId)
                    .filter(rate -> rate.getForexBuying() != null)
                    .map(rate -> buildQuote(type, instrumentId, rate.getForexBuying()));
            case BOND -> getBondQuote(instrumentId);
            case VIOP -> Optional.empty();
        };
    }

    private Optional<MarketPriceQuote> getStockQuote(Long stockId) {
        BigDecimal basePrice = stockPriceHistoryRepository
                .findFirstByStockIdOrderByTradeDateDesc(stockId)
                .map(history -> history.getClosePrice())
                .orElse(null);
        if (basePrice == null) {
            return Optional.empty();
        }
        return Optional.of(buildQuote(InstrumentType.STOCK, stockId, basePrice));
    }

    private Optional<MarketPriceQuote> getBondQuote(Long bondId) {
        Bond bond = bondRepository.findById(bondId).orElse(null);
        BigDecimal basePrice = bondRateHistoryRepository.findFirstByBondIdOrderByRateDateDesc(bondId)
                .map(history -> history.getInterestRate() != null ? BOND_NOMINAL_VALUE : null)
                .orElse(null);
        if (basePrice == null && bond == null) {
            return Optional.empty();
        }
        return Optional.of(buildQuote(InstrumentType.BOND, bondId, basePrice == null ? BOND_NOMINAL_VALUE : basePrice));
    }

    private MarketPriceQuote buildQuote(InstrumentType type, Long instrumentId, BigDecimal basePrice) {
        long minuteSeed = Instant.now().toEpochMilli() / 60000L;
        BigDecimal dailyMovePct = deterministicPct(type, instrumentId, minuteSeed / 1440L, 2);
        BigDecimal currentPrice = basePrice.setScale(PRICE_SCALE, RoundingMode.HALF_UP);
        BigDecimal previousPrice = applyPct(basePrice, dailyMovePct.negate());
        BigDecimal dailyChange = currentPrice.subtract(previousPrice).setScale(PRICE_SCALE, RoundingMode.HALF_UP);
        BigDecimal dailyChangePct = previousPrice.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : dailyChange.multiply(BigDecimal.valueOf(100)).divide(previousPrice, 2, RoundingMode.HALF_UP);

        return new MarketPriceQuote(
                currentPrice,
                dailyChange,
                dailyChangePct,
                buildTrend(type, instrumentId, basePrice, minuteSeed)
        );
    }

    private List<BigDecimal> buildTrend(InstrumentType type, Long instrumentId, BigDecimal basePrice, long minuteSeed) {
        List<BigDecimal> trend = new ArrayList<>(TREND_DAYS);
        for (int i = TREND_DAYS - 1; i >= 0; i--) {
            trend.add(applyPct(basePrice, deterministicPct(type, instrumentId, minuteSeed - i * 1440L, 3)));
        }
        return trend;
    }

    private BigDecimal applyPct(BigDecimal value, BigDecimal pct) {
        return value.multiply(BigDecimal.ONE.add(pct.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)))
                .setScale(PRICE_SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal deterministicPct(InstrumentType type, Long instrumentId, long seed, int maxAbsPct) {
        long hash = 1469598103934665603L;
        String key = type.name() + ":" + instrumentId + ":" + seed;
        for (int i = 0; i < key.length(); i++) {
            hash ^= key.charAt(i);
            hash *= 1099511628211L;
        }
        long bucket = Math.floorMod(hash, 20001);
        BigDecimal normalized = BigDecimal.valueOf(bucket).subtract(BigDecimal.valueOf(10000))
                .divide(BigDecimal.valueOf(10000), 6, RoundingMode.HALF_UP);
        return normalized.multiply(BigDecimal.valueOf(maxAbsPct)).setScale(4, RoundingMode.HALF_UP);
    }

    public record MarketPriceQuote(
            BigDecimal currentPrice,
            BigDecimal dailyChange,
            BigDecimal dailyChangePercentage,
            List<BigDecimal> priceTrend
    ) {
    }
}
