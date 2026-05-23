package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class InstrumentPriceResolverService {

    private static final BigDecimal BOND_NOMINAL_VALUE = new BigDecimal("100");

    private final StockRepository stockRepository;
    private final StockPriceHistoryRepository stockPriceHistoryRepository;
    private final StockPriceSnapshotRepository stockPriceSnapshotRepository;
    private final FundRepository fundRepository;
    private final FundPriceRepository fundPriceRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;
    private final ViopContractPriceRepository viopContractPriceRepository;

    public record InstrumentInfo(String symbol, String name, String nativeCurrency, BigDecimal currentPrice) {}

    public InstrumentInfo resolve(InstrumentType type, Long instrumentId) {
        return resolve(type, instrumentId, null);
    }

    public InstrumentInfo resolve(InstrumentType type, Long instrumentId, String symbolHint) {
        if (type == InstrumentType.DEPOSIT) {
            return new InstrumentInfo(null, null, "TRY", null);
        }
        if (type == InstrumentType.CURRENCY) {
            return resolveFx(instrumentId, symbolHint);
        }
        if (type == InstrumentType.STOCK && instrumentId == null && symbolHint != null) {
            return resolveStockBySymbol(symbolHint);
        }
        if (type == InstrumentType.FUND && instrumentId == null && symbolHint != null) {
            return resolveFundByCode(symbolHint);
        }
        if (instrumentId == null) {
            return new InstrumentInfo(null, null, "TRY", null);
        }
        return switch (type) {
            case STOCK -> resolveStock(instrumentId);
            case FUND -> resolveFund(instrumentId);
            case BOND -> resolveBond(instrumentId);
            case VIOP -> resolveViop(instrumentId, symbolHint);
            default -> new InstrumentInfo(null, null, "TRY", null);
        };
    }

    private InstrumentInfo resolveStock(Long stockId) {
        var stock = stockRepository.findById(stockId).orElse(null);
        BigDecimal price = stockPriceSnapshotRepository
                .findTopByStockIdAndTradeDateOrderByFetchedAtDesc(stockId, LocalDate.now())
                .map(s -> s.getPrice())
                .or(() -> stockPriceHistoryRepository
                        .findFirstByStockIdOrderByTradeDateDesc(stockId)
                        .map(h -> h.getClosePrice()))
                .orElse(null);
        String symbol = stock != null ? stock.getSymbol() : null;
        String name = stock != null ? stock.getShortName() : null;
        String currency = stock != null && stock.getCurrency() != null ? stock.getCurrency() : "TRY";
        return new InstrumentInfo(symbol, name, currency, price);
    }

    private InstrumentInfo resolveFund(Long fundId) {
        var fund = fundRepository.findById(fundId).orElse(null);
        BigDecimal price = fundPriceRepository
                .findFirstByFundIdOrderByPriceDateDesc(fundId)
                .map(p -> p.getPrice()).orElse(null);
        String symbol = fund != null ? fund.getCode() : null;
        String name = fund != null ? fund.getName() : null;
        return new InstrumentInfo(symbol, name, "TRY", price);
    }

    private InstrumentInfo resolveFx(Long exchangeRateId, String symbolHint) {
        String currencyCode = null;
        String currencyName = null;

        if (exchangeRateId != null) {
            var original = exchangeRateRepository.findById(exchangeRateId).orElse(null);
            if (original != null && original.getCurrencyCode() != null) {
                currencyCode = original.getCurrencyCode();
                currencyName = original.getCurrencyName();
            }
        }

        if (currencyCode == null) {
            currencyCode = symbolHint;
        }

        if (currencyCode == null) {
            return new InstrumentInfo(null, null, "TRY", null);
        }

        var recent = exchangeRateRepository.findTop8ByCurrencyCodeOrderByRateDateDesc(currencyCode);
        BigDecimal price = recent.stream()
                .map(ExchangeRate::getForexBuying)
                .filter(b -> b != null && b.compareTo(BigDecimal.ZERO) > 0)
                .findFirst()
                .orElse(null);

        if (currencyName == null && !recent.isEmpty()) {
            currencyName = recent.get(0).getCurrencyName();
        }

        return new InstrumentInfo(currencyCode, currencyName, "TRY", price);
    }

    private InstrumentInfo resolveStockBySymbol(String symbol) {
        var stock = stockRepository.findBySymbol(symbol).orElse(null);
        if (stock == null) return new InstrumentInfo(symbol, null, "TRY", null);
        return resolveStock(stock.getId());
    }

    private InstrumentInfo resolveFundByCode(String code) {
        var fund = fundRepository.findByCode(code).orElse(null);
        if (fund == null) return new InstrumentInfo(code, null, "TRY", null);
        return resolveFund(fund.getId());
    }

    private InstrumentInfo resolveBond(Long bondId) {
        var bond = bondRepository.findById(bondId).orElse(null);
        BigDecimal interestRate = bondRateHistoryRepository
                .findFirstByBondIdOrderByRateDateDesc(bondId)
                .map(h -> h.getInterestRate()).orElse(null);
        BigDecimal price = interestRate != null ? BOND_NOMINAL_VALUE : null;
        String symbol = bond != null ? bond.getEvdsSeriesCode() : null;
        String name = bond != null ? bond.getName() : null;
        String currency = bond != null && bond.getCurrency() != null ? bond.getCurrency() : "TRY";
        return new InstrumentInfo(symbol, name, currency, price);
    }

    private InstrumentInfo resolveViop(Long contractId, String symbolHint) {
        var byId = viopContractPriceRepository.findById(contractId);

        if (byId.isPresent()) {
            var original = byId.get();
            var c = viopContractPriceRepository
                    .findFirstByMarketSegmentAndContractNameOrderByTradeDateDesc(
                            original.getMarketSegment(), original.getContractName())
                    .orElse(original);
            return new InstrumentInfo(c.getContractName(),
                    c.getUnderlyingSymbol() != null ? c.getUnderlyingSymbol() : c.getMarketSegment(),
                    "TRY", c.getLastPrice());
        }

        if (symbolHint != null) {
            var recent = viopContractPriceRepository.findTop8ByContractNameOrderByTradeDateDesc(symbolHint);
            if (!recent.isEmpty()) {
                var c = recent.get(0);
                return new InstrumentInfo(c.getContractName(),
                        c.getUnderlyingSymbol() != null ? c.getUnderlyingSymbol() : c.getMarketSegment(),
                        "TRY", c.getLastPrice());
            }
        }

        return new InstrumentInfo(null, null, "TRY", null);
    }

}
