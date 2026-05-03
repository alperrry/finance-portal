package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.matcher.PriceMatcher;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.repository.TradeTransactionRepository;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * PENDING durumdaki trade'leri tarayan ve uygun PriceMatcher'a yönlendiren servis.
 * TradeJob (scheduler) tarafından konfigüre edilebilir aralıklarla çağrılır.
 */
@Service
@Log4j2
public class TradeMatchingService {

    private final TradeTransactionRepository tradeTransactionRepository;
    private final TradeProcessService tradeProcessService;
    private final Map<InstrumentType, PriceMatcher> matchersByType;

    public TradeMatchingService(TradeTransactionRepository tradeTransactionRepository,
                                TradeProcessService tradeProcessService,
                                List<PriceMatcher> matchers) {
        this.tradeTransactionRepository = tradeTransactionRepository;
        this.tradeProcessService = tradeProcessService;
        this.matchersByType = new EnumMap<>(InstrumentType.class);
        for (PriceMatcher matcher : matchers) {
            matchersByType.put(matcher.getSupportedType(), matcher);
        }
        log.info("TradeMatchingService başlatıldı. Tanımlı matcher tipleri: {}", matchersByType.keySet());
    }

    /**
     * Tüm PENDING trade'leri tarar, eşleşenleri TradeProcessService'e iletir.
     * Her trade için ayrı transaction çalıştırılır (TradeProcessService.execute @Transactional);
     * birinin başarısız olması diğerlerini etkilemez.
     */
    @Transactional(readOnly = true)
    public void matchPendingTrades() {
        long startMillis = System.currentTimeMillis();
        log.info("TradeMatchingJob başladı");

        List<TradeTransaction> pendingTrades = tradeTransactionRepository
                .findAllByStatus(TransactionStatus.PENDING);

        int triggered = 0;
        int skipped = 0;

        for (TradeTransaction trade : pendingTrades) {
            PriceMatcher matcher = matchersByType.get(trade.getInstrumentType());
            if (matcher == null) {
                log.warn("Bu enstrüman tipi için matcher tanımlı değil. tradeId={}, type={}",
                        trade.getId(), trade.getInstrumentType());
                skipped++;
                continue;
            }

            try {
                Optional<BigDecimal> executionPriceOpt = matcher.match(trade);
                if (executionPriceOpt.isPresent()) {
                    tradeProcessService.execute(trade, executionPriceOpt.get());
                    triggered++;
                } else {
                    skipped++;
                }
            } catch (Exception e) {
                log.error("Trade işlenirken beklenmeyen hata. tradeId={}", trade.getId(), e);
                skipped++;
            }
        }

        long elapsedMillis = System.currentTimeMillis() - startMillis;
        log.info("TradeMatchingJob tamamlandı. tarandı={}, tetiklendi={}, atlandı={}, süre={}ms",
                pendingTrades.size(), triggered, skipped, elapsedMillis);
    }
}