package com.alper.backend.market.viop.scheduler;

import com.alper.backend.market.viop.service.ViopScraperService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * VİOP kontrat fiyatlarını web scraping ile çeken zamanlanmış iş.
 *
 * <p>Uygulama açılışında eksik veriler bir kez tamamlanır
 * ({@code app.startup-tasks.enabled} ile kapatılabilir); sonrasında
 * {@code viop.cron} ifadesiyle periyodik çalışır.</p>
 */
@Log4j2
@Component
@RequiredArgsConstructor
public class ViopJob {
    private final ViopScraperService viopScraperService;

    @Value("${app.startup-tasks.enabled:true}")
    private boolean startupTasksEnabled;

    /** Uygulama hazır olduğunda VİOP verilerini bir kez çeker. */
    @EventListener(ApplicationReadyEvent.class)
    public void fetchMissingOnStartup() {
        if (!startupTasksEnabled) {
            log.info("Startup VİOP fetch kapalı, atlandı.");
            return;
        }
        log.info("Startup VİOP fetch başlatıldı.");
        fetchDaily();
    }

    /** Günlük VİOP kontrat fiyatlarını çekip kaydeder. */
    @Scheduled(cron = "${viop.cron}")
    public void fetchDaily() {
        log.info("VİOP günlük job başladı.");
        try {
            viopScraperService.fetchAndSaveDaily();
            log.info("VİOP günlük job tamamlandı.");
        } catch (Exception e) {
            log.error("VİOP günlük job hata ile sonlandı. cause={}", e.getMessage(), e);
        }
    }
}
