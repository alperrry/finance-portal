package com.alper.backend.market.fx.scheduler;

import com.alper.backend.market.fx.service.TcmbService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Günlük döviz kurlarını TCMB'den çeken zamanlanmış iş.
 *
 * <p>Cron ifadesi {@code tcmb.cron} özelliğinden okunur; her çalışmada
 * {@code fx} önbelleği temizlenir.</p>
 */
@Log4j2
@Component
@RequiredArgsConstructor
public class FxJob {

    private final TcmbService tcmbService;

    /** Günlük kurları çekip kaydeder ve kur önbelleğini boşaltır. */
    // TCMB her iş günü 15:30'da günceller
    @CacheEvict(value = "fx", allEntries = true)
    @Scheduled(cron = "${tcmb.cron}")
    public void fetchDailyRates() {
        log.info("TcmbJob başladı.");
        tcmbService.fetchAndSave();
        log.info("TcmbJob tamamlandı.");
    }
}