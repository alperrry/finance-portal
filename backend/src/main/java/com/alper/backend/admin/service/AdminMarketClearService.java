package com.alper.backend.admin.service;

import com.alper.backend.admin.audit.AdminAudited;
import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockTechnicalIndicatorRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Log4j2
public class AdminMarketClearService {

    private final ExchangeRateRepository exchangeRateRepository;
    private final StockPriceHistoryRepository stockPriceHistoryRepository;
    private final StockPriceSnapshotRepository stockPriceSnapshotRepository;
    private final StockTechnicalIndicatorRepository stockTechnicalIndicatorRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;
    private final FundPriceRepository fundPriceRepository;
    private final FundAllocationRepository fundAllocationRepository;
    private final MacroObservationRepository macroObservationRepository;
    private final ViopContractPriceRepository viopContractPriceRepository;

    @AdminAudited(action = AuditAction.MARKET_DATA_CLEARED, targetType = "market")
    @Transactional
    public long clearFx() {
        long count = exchangeRateRepository.count();
        exchangeRateRepository.deleteAllInBatch();
        log.info("FX verileri temizlendi | silinen={}", count);
        return count;
    }

    @AdminAudited(action = AuditAction.MARKET_DATA_CLEARED, targetType = "market")
    @Transactional
    public long clearStocks() {
        long indicators = stockTechnicalIndicatorRepository.count();
        long snapshots = stockPriceSnapshotRepository.count();
        long history = stockPriceHistoryRepository.count();
        stockTechnicalIndicatorRepository.deleteAllInBatch();
        stockPriceSnapshotRepository.deleteAllInBatch();
        stockPriceHistoryRepository.deleteAllInBatch();
        long total = indicators + snapshots + history;
        log.info("Stocks verileri temizlendi | history={} snapshot={} indicator={}", history, snapshots, indicators);
        return total;
    }

    @AdminAudited(action = AuditAction.MARKET_DATA_CLEARED, targetType = "market")
    @Transactional
    public long clearBonds() {
        long count = bondRateHistoryRepository.count();
        bondRateHistoryRepository.deleteAllInBatch();
        log.info("Bond rate history temizlendi | silinen={}", count);
        return count;
    }

    @AdminAudited(action = AuditAction.MARKET_DATA_CLEARED, targetType = "market")
    @Transactional
    public long clearFunds() {
        long allocations = fundAllocationRepository.count();
        long prices = fundPriceRepository.count();
        fundAllocationRepository.deleteAllInBatch();
        fundPriceRepository.deleteAllInBatch();
        long total = allocations + prices;
        log.info("Fund verileri temizlendi | price={} allocation={}", prices, allocations);
        return total;
    }

    @AdminAudited(action = AuditAction.MARKET_DATA_CLEARED, targetType = "market")
    @Transactional
    public long clearMacro() {
        long count = macroObservationRepository.count();
        macroObservationRepository.deleteAllInBatch();
        log.info("Macro observation temizlendi | silinen={}", count);
        return count;
    }

    @AdminAudited(action = AuditAction.MARKET_DATA_CLEARED, targetType = "market")
    @Transactional
    public long clearViop() {
        long count = viopContractPriceRepository.count();
        viopContractPriceRepository.deleteAllInBatch();
        log.info("VIOP verileri temizlendi | silinen={}", count);
        return count;
    }
}
