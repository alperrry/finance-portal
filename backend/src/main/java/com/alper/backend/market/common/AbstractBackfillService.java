package com.alper.backend.market.common;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Piyasa veri modülleri için ortak backfill iskeleti (template method).
 *
 * <p>Uygulama hazır olduğunda ({@code ApplicationReadyEvent}) bilinen tüm öğeleri
 * dolaşır, eksik gün aralığını tespit eder ve alt sınıfın {@link #fetchAndSave}
 * uygulamasını çağırır. Varsayılan geriye-sarkma {@value #BACKFILL_DAYS} gündür.
 * Test/CI ortamı için {@code app.startup-tasks.enabled=false} ile devre dışı bırakılabilir.</p>
 *
 * @param <T> backfill edilen öğe (örn. Stock, Fund, Bond)
 */
@Log4j2
public abstract class AbstractBackfillService<T> {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final int BACKFILL_DAYS = 365;

    @Value("${app.startup-tasks.enabled:true}")
    private boolean startupTasksEnabled = true;

    protected abstract List<T> getAllItems();
    protected abstract String getSeriesCode(T item);
    protected abstract Optional<LocalDate> getLatestRateDate(T item);
    protected abstract long countExistingRecords(T item, LocalDate start, LocalDate end);
    protected abstract void fetchAndSave(T item, String startDate, String endDate);

    @EventListener(ApplicationReadyEvent.class)
    public void backfillIfEmpty() {
        if (!startupTasksEnabled) {
            log.info("Startup backfill kapalı, atlandı: {}", getClass().getSimpleName());
            return;
        }

        List<T> items = getAllItems();
        for (T item : items) {
            String seriesCode = getSeriesCode(item);
            try {
                LocalDate today = LocalDate.now();
                LocalDate backfillStart = today.minusDays(BACKFILL_DAYS);
                LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(today);

                Optional<LocalDate> latestDateOpt = getLatestRateDate(item);

                if (latestDateOpt.isEmpty() || latestDateOpt.get().isBefore(lastCompleted)) {
                    LocalDate startLocal = latestDateOpt
                            .map(d -> d.plusDays(1))
                            .orElse(backfillStart);
                    triggerBackfill(item, seriesCode, startLocal, today);
                    continue;
                }

                long expected = TurkishHolidayUtil.countTradingDays(backfillStart, lastCompleted);
                long actual = countExistingRecords(item, backfillStart, lastCompleted);

                if (actual < expected) {
                    log.info("Gap tespit edildi: {} | Beklenen: {}, Mevcut: {}",
                            seriesCode, expected, actual);
                    triggerBackfill(item, seriesCode, backfillStart, today);
                    continue;
                }

                log.info("Backfill atlandı, veri güncel: {} (son tarih: {})",
                        seriesCode, latestDateOpt.get());

            } catch (Exception e) {
                log.warn("Backfill başarısız: {} → {}", seriesCode, e.getMessage());
            }
        }
    }

    private void triggerBackfill(T item, String seriesCode, LocalDate start, LocalDate end) {
        String startDate = start.format(DATE_FORMAT);
        String endDate = end.format(DATE_FORMAT);
        log.info("Backfill başladı: {} | {} → {}", seriesCode, startDate, endDate);
        fetchAndSave(item, startDate, endDate);
        log.info("Backfill tamamlandı: {}", seriesCode);
    }
}