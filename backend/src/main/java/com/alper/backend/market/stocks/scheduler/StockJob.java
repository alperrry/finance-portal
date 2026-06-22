package com.alper.backend.market.stocks.scheduler;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.market.stocks.service.YahooService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Hisse senedi günlük fiyat geçmişini Yahoo Finance'tan çeken zamanlanmış iş.
 *
 * <p>Uygulama açılışında da bir kez tetiklenir ({@code app.startup-tasks.enabled}
 * ile kapatılabilir); her çalışmada {@code stocks} önbelleği temizlenir.</p>
 */
@Log4j2
@Component
@RequiredArgsConstructor
public class StockJob {

    private final YahooService yahooService;

    @Value("${app.startup-tasks.enabled:true}")
    private boolean startupTasksEnabled = true;

    /** Günlük fiyat geçmişini çekip kaydeder ve hisse önbelleğini boşaltır. */
    @CacheEvict(value = "stocks", allEntries = true)
    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "${market.daily.stocks.cron}")
    public void fetchDailyHistory() {
        if (!startupTasksEnabled) {
            log.info("Startup stock daily history kapalı, atlandı.");
            return;
        }

        log.info("StockJob günlük history başladı.");
        try {
            yahooService.fetchAndSaveDailyHistory();
            log.info("StockJob günlük history tamamlandı.");
        } catch (ExternalApiException ex) {
            log.error("[STOCK_FETCH_ERROR] Günlük history alınamadı | cause={}", ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("[UNEXPECTED_ERROR] Günlük history job beklenmedik hata | cause={}", ex.getMessage(), ex);
        }
    }
}
