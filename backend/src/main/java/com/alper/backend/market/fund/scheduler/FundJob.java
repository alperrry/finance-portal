package com.alper.backend.market.fund.scheduler;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.market.fund.service.TefasService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Yatırım fonu fiyatlarını TEFAS'tan periyodik olarak çeken zamanlanmış iş.
 *
 * <p>Cron ifadesi {@code fund.daily-cron} özelliğinden okunur. Hatalar loglanır,
 * iş bir sonraki tetiklemede yeniden dener.</p>
 */
@Log4j2
@Component
@RequiredArgsConstructor
public class FundJob {

    private final TefasService tefasService;

    /** Günlük fon fiyat ve dağılım verilerini çekip kaydeder. */
    @Scheduled(cron = "${fund.daily-cron}")
    public void fetchDaily() {
        log.info("FundJob başladı.");
        try {
            tefasService.fetchAndSave();
            log.info("FundJob tamamlandı.");
        } catch (ExternalApiException ex) {
            log.error("[FUND_FETCH_ERROR] Fon verisi alınamadı | cause={}", ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("[UNEXPECTED_ERROR] FundJob beklenmedik hata | cause={}", ex.getMessage(), ex);
        }
    }
}