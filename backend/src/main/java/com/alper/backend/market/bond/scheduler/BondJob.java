package com.alper.backend.market.bond.scheduler;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.market.bond.service.EvdsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Log4j2
@Component
@RequiredArgsConstructor
public class BondJob {

    private static final DateTimeFormatter EVDS_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final EvdsService evdsService;

    @Scheduled(cron = "${evds.cron}")
    public void fetchBondRates() {
        log.info("BondJob başladı.");

        String today     = LocalDate.now().format(EVDS_DATE_FORMAT);
        String startDate = LocalDate.now().minusDays(1).format(EVDS_DATE_FORMAT);

        try {
            evdsService.fetchAndSaveAll(startDate, today);
            log.info("BondJob tamamlandı.");
        } catch (ExternalApiException ex) {
            log.error("[BOND_FETCH_ERROR] Veri alınamadı | cause={}", ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("[UNEXPECTED_ERROR] BondJob beklenmedik hata | cause={}", ex.getMessage(), ex);
        }
    }
}