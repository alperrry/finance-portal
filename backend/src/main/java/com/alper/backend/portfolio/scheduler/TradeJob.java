package com.alper.backend.portfolio.scheduler;

import com.alper.backend.portfolio.service.TradeMatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * PENDING durumdaki trade'leri günlük kapanmış verilerle tarayan scheduler.
 *
 * <p>Cron ifadesi {@code portfolio.trade-matching.cron} property'si ile değiştirilebilir.
 * Default değer: her gün 02:45.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class TradeJob {

    private final TradeMatchingService tradeMatchingService;

    @Scheduled(cron = "${portfolio.trade-matching.cron:0 45 2 * * MON-SAT}")
    public void runMatching() {
        log.info("TradeJob başladı.");
        try {
            tradeMatchingService.matchPendingTrades();
            log.info("TradeJob tamamlandı.");
        } catch (Exception e) {
            log.error("TradeJob beklenmeyen hata ile sonlandı", e);
        }
    }
}
