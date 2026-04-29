package com.alper.backend.market.stocks.scheduler;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.market.stocks.service.YahooService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Log4j2
@Component
@RequiredArgsConstructor
public class StockJob {

    private final YahooService yahooService;

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "${stock.snapshot.cron}")
    public void fetchSnapshot() {
        log.info("StockJob snapshot başladı.");
        try {
            yahooService.fetchAndSaveSnapshot();
            log.info("StockJob snapshot tamamlandı.");
        } catch (ExternalApiException ex) {
            log.error("[STOCK_FETCH_ERROR] Snapshot alınamadı | cause={}", ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("[UNEXPECTED_ERROR] Snapshot job beklenmedik hata | cause={}", ex.getMessage(), ex);
        }
    }

    @Scheduled(cron = "${stock.closing.cron}")
    public void fetchClosingAndClean() {
        log.info("StockJob kapanış başladı.");
        try {
            yahooService.fetchAndSaveHistory();
            yahooService.cleanSnapshots();
            log.info("StockJob kapanış tamamlandı.");
        } catch (ExternalApiException ex) {
            log.error("[STOCK_FETCH_ERROR] Kapanış verisi alınamadı | cause={}", ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("[UNEXPECTED_ERROR] Kapanış job beklenmedik hata | cause={}", ex.getMessage(), ex);
        }
    }
}