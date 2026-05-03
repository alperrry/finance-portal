package com.alper.backend.portfolio.scheduler;

import com.alper.backend.portfolio.service.TradeMatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * PENDING durumdaki trade'leri konfigüre edilen aralıklarla tarayan scheduler.
 *
 * <p>Cron ifadesi {@code portfolio.trade-matching.cron} property'si ile değiştirilebilir.
 * Default değer: her 30 saniyede bir.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class TradeJob {

    private final TradeMatchingService tradeMatchingService;

    @Scheduled(cron = "${portfolio.trade-matching.cron:*/30 * * * * *}")
    public void runMatching() {
        try {
            tradeMatchingService.matchPendingTrades();
        } catch (Exception e) {
            // Schedule edilen metodda exception fırlatırsak bir sonraki tetiklemeyi etkilememesi için yakalıyoruz.
            log.error("TradeJob beklenmeyen hata ile sonlandı", e);
        }
    }
}