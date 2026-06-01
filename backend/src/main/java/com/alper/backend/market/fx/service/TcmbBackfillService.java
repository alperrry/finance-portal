package com.alper.backend.market.fx.service;

import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.common.TurkishHolidayUtil; // <-- Ortak util kullanıldı
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * TCMB döviz kuru arşivinden tarihsel verileri çekip {@code exchange_rate}'e yazan backfill servisi.
 *
 * <p>{@code tcmb.retention-days} kadar geriye sarkar; eksik günleri tespit edip arşiv XML
 * dosyalarını (klasör formatı {@code yyyyMM}, dosya formatı {@code ddMMyyyy}) indirir ve
 * ayrıştırır.</p>
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class TcmbBackfillService {

    private static final DateTimeFormatter TCMB_ARCHIVE_FOLDER_FORMAT = DateTimeFormatter.ofPattern("yyyyMM");
    private static final DateTimeFormatter TCMB_ARCHIVE_FILE_FORMAT   = DateTimeFormatter.ofPattern("ddMMyyyy");

    @Value("${tcmb.retention-days}")
    private int retentionDays;

    @Value("${tcmb.archive-url}")
    private String archiveUrl;

    @Value("${app.startup-tasks.enabled:true}")
    private boolean startupTasksEnabled = true;

    private final TcmbService tcmbService;
    private final ExchangeRateRepository exchangeRateRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void backfillIfNeeded() {
        if (!startupTasksEnabled) {
            log.info("Startup backfill kapalı, TCMB atlandı.");
            return;
        }

        LocalDate today = LocalDate.now();
        LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(today);
        LocalDate backfillStart = today.minusDays(retentionDays);

        // 1. Freshness kontrolü
        boolean upToDate = exchangeRateRepository
                .findByCurrencyCodeAndRateDate("USD", lastCompleted)
                .isPresent();

        if (upToDate) {
            // 2. Gap kontrolü
            long expected = TurkishHolidayUtil.countTradingDays(backfillStart, lastCompleted);
            long actual = exchangeRateRepository.countByCurrencyCodeAndRateDateBetween("USD", backfillStart, lastCompleted);

            if (actual >= expected) {
                log.info("TCMB backfill atlandı, veri güncel. Son tarih: {}", lastCompleted);
                return;
            }
            log.info("TCMB gap tespit edildi | Beklenen: {}, Mevcut: {}", expected, actual);
        }

        log.info("TCMB backfill başladı, son {} iş günü dolduruluyor...", retentionDays);
        List<LocalDate> missingDates = resolveBusinessDays();
        int success = 0, failed = 0;

        for (LocalDate date : missingDates) {
            // Zaten varsa atla
            if (exchangeRateRepository.findByCurrencyCodeAndRateDate("USD", date).isPresent()) {
                continue;
            }
            try {
                tcmbService.fetchAndSaveForDate(buildArchiveUrl(date), date);
                success++;
            } catch (Exception e) {
                log.warn("TCMB backfill tarih atlandı: {} → {}", date, e.getMessage());
                failed++;
            }
        }

        log.info("TCMB backfill tamamlandı. Başarılı: {}, Başarısız: {}", success, failed);
    }

    private List<LocalDate> resolveBusinessDays() {
        List<LocalDate> businessDays = new ArrayList<>();
        LocalDate start = LocalDate.now().minusDays(retentionDays);
        LocalDate end   = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            if (TurkishHolidayUtil.isTradingDay(date)) {
                businessDays.add(date);
            }
        }
        return businessDays;
    }

    private String buildArchiveUrl(LocalDate date) {
        return String.format(archiveUrl,
                date.format(TCMB_ARCHIVE_FOLDER_FORMAT),
                date.format(TCMB_ARCHIVE_FILE_FORMAT));
    }
}
