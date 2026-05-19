package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class InstrumentPriceResolverService {

    private static final BigDecimal BOND_NOMINAL_VALUE = new BigDecimal("100");

    private final StockRepository stockRepository;
    private final StockPriceHistoryRepository stockPriceHistoryRepository;
    private final FundRepository fundRepository;
    private final FundPriceRepository fundPriceRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;
    private final ViopContractPriceRepository viopContractPriceRepository;

    public record InstrumentInfo(String symbol, String name, String nativeCurrency, BigDecimal currentPrice) {}

    public InstrumentInfo resolve(InstrumentType type, Long instrumentId) {
        if (instrumentId == null) {
            return new InstrumentInfo(null, null, "TRY", null);
        }
        return switch (type) {
            case STOCK -> resolveStock(instrumentId);
            case FUND -> resolveFund(instrumentId);
            case CURRENCY -> resolveFx(instrumentId);
            case BOND -> resolveBond(instrumentId);
            case VIOP -> resolveViop(instrumentId);
            case DEPOSIT -> new InstrumentInfo(null, null, "TRY", null);
        };
    }

    private InstrumentInfo resolveStock(Long stockId) {
        var stock = stockRepository.findById(stockId).orElse(null);
        BigDecimal price = stockPriceHistoryRepository
                .findFirstByStockIdOrderByTradeDateDesc(stockId)
                .map(h -> h.getClosePrice()).orElse(null);
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

    private InstrumentInfo resolveFx(Long exchangeRateId) {
        var rateOpt = exchangeRateRepository.findFirstByIdOrderByRateDateDesc(exchangeRateId);
        if (rateOpt.isEmpty()) return new InstrumentInfo(null, null, "TRY", null);
        var rate = rateOpt.get();
        return new InstrumentInfo(rate.getCurrencyCode(), rate.getCurrencyName(), "TRY", rate.getForexBuying());
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

    private InstrumentInfo resolveViop(Long contractId) {
        return viopContractPriceRepository.findById(contractId)
                .map(c -> new InstrumentInfo(c.getContractName(),
                        c.getUnderlyingSymbol() != null ? c.getUnderlyingSymbol() : c.getMarketSegment(),
                        "TRY", c.getLastPrice()))
                .orElse(new InstrumentInfo(null, null, "TRY", null));
    }

}
