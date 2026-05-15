package com.alper.backend.market.macro.scheduler;

import com.alper.backend.market.macro.service.MacroFetchService;
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
public class MacroJob {
    private final MacroFetchService macroFetchService;

    @Value("${app.startup-tasks.enabled:true}")
    private boolean startupTasksEnabled;

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

    @Scheduled(cron = "${macro.deposit.cron}")
    public void fetchDepositRates() {
        log.info("Macro deposit job başladı.");
        macroFetchService.fetchDepositRates();
        log.info("Macro deposit job tamamlandı.");
    }

    @Scheduled(cron = "${macro.inflation.cron}")
    public void fetchInflation() {
        log.info("Macro inflation job başladı.");
        macroFetchService.fetchInflation();
        log.info("Macro inflation job tamamlandı.");
    }
}
