package com.alper.backend.market.stocks.scheduler;

import com.alper.backend.market.stocks.service.StockIndicatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Log4j2
@Component
@RequiredArgsConstructor
public class IndicatorJob {

    private final StockIndicatorService indicatorService;

    @Value("${app.startup-tasks.enabled:true}")
    private boolean startupTasksEnabled = true;

    /**
     * Uygulama açıldığında bir kez çalışır — bootstrap için tüm indikatörleri hesaplar.
     * Fiyat backfill'i AbstractBackfillService tarafından zaten ApplicationReadyEvent'te tetikleniyor;
     * Spring event listener sırası garanti olmadığı için burada da çalışsa idempotent — upsert.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void bootstrap() {
        if (!startupTasksEnabled) {
            log.info("Startup indicator bootstrap kapalı, atlandı.");
            return;
        }

        log.info("IndicatorJob bootstrap başladı.");
        try {
            indicatorService.recalculateAll();
            log.info("IndicatorJob bootstrap tamamlandı.");
        } catch (Exception e) {
            log.error("[INDICATOR_ERROR] Bootstrap beklenmedik hata | cause={}", e.getMessage(), e);
        }
    }

    /**
     * Fiyat kapanış job'undan sonra çalışır.
     * Cron'u application.yml'de tanımla — kapanış job cron'undan ~30 dk sonra olmalı.
     * Örn: kapanış 18:05 ise indikatör 18:35.
     */
    @Scheduled(cron = "${stock.indicator.cron}")
    public void scheduledRecalc() {
        if (!startupTasksEnabled) {
            log.info("Startup indicator scheduled job kapalı, atlandı.");
            return;
        }

        log.info("IndicatorJob scheduled başladı.");
        try {
            indicatorService.recalculateAll();
            log.info("IndicatorJob scheduled tamamlandı.");
        } catch (Exception e) {
            log.error("[INDICATOR_ERROR] Scheduled beklenmedik hata | cause={}", e.getMessage(), e);
        }
    }
}
