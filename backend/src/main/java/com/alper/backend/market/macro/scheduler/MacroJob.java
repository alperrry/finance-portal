package com.alper.backend.market.macro.scheduler;

import com.alper.backend.market.macro.service.MacroFetchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Makro göstergeleri (enflasyon, mevduat faizi) EVDS'den çeken zamanlanmış işler.
 *
 * <p>Uygulama açılışında eksik veriler bir kez tamamlanır
 * ({@code app.startup-tasks.enabled} ile kapatılabilir); sonrasında her gösterge
 * kendi cron ifadesiyle periyodik güncellenir.</p>
 */
@Log4j2
@Component
@RequiredArgsConstructor
public class MacroJob {
    private final MacroFetchService macroFetchService;

    @Value("${app.startup-tasks.enabled:true}")
    private boolean startupTasksEnabled;

    /** Uygulama hazır olduğunda enflasyon ve mevduat verilerini bir kez çeker. */
    @EventListener(ApplicationReadyEvent.class)
    public void fetchMissingOnStartup() {
        if (!startupTasksEnabled) {
            log.info("Startup macro fetch kapalı, atlandı.");
            return;
        }
        log.info("Startup macro fetch başlatıldı.");
        fetchInflation();
        fetchDepositRates();
    }

    /** Mevduat faizi verilerini çekip kaydeder. */
    @Scheduled(cron = "${macro.deposit.cron}")
    public void fetchDepositRates() {
        log.info("Macro deposit job başladı.");
        macroFetchService.fetchDepositRates();
        log.info("Macro deposit job tamamlandı.");
    }

    /** Enflasyon verilerini çekip kaydeder. */
    @Scheduled(cron = "${macro.inflation.cron}")
    public void fetchInflation() {
        log.info("Macro inflation job başladı.");
        macroFetchService.fetchInflation();
        log.info("Macro inflation job tamamlandı.");
    }
}
