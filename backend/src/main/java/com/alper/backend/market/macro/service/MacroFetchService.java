package com.alper.backend.market.macro.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.macro.client.MacroEvdsClient;
import com.alper.backend.market.macro.model.MacroDataType;
import com.alper.backend.market.macro.model.MacroObservation;
import com.alper.backend.market.macro.model.MacroSeries;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.market.macro.repository.MacroSeriesRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class MacroFetchService {
    private static final DateTimeFormatter EVDS_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final MacroEvdsClient evdsClient;
    private final ObjectMapper objectMapper;
    private final MacroSeriesRepository seriesRepository;
    private final MacroObservationRepository observationRepository;

    @Transactional
    @CacheEvict(value = "macro", allEntries = true)
    public void fetchInflation() {
        fetchType(MacroDataType.INFLATION);
    }

    @Transactional
    @CacheEvict(value = "macro", allEntries = true)
    public void fetchDepositRates() {
        fetchType(MacroDataType.DEPOSIT_RATE);
    }

    private void fetchType(MacroDataType type) {
        List<MacroSeries> seriesList = seriesRepository.findByDataTypeAndIsActiveTrue(type);
        if (seriesList.isEmpty()) {
            log.info("Aktif macro series yok, atlandı. type={}", type);
            return;
        }
        LocalDate end = LocalDate.now().minusDays(1);
        for (MacroSeries series : seriesList) {
            LocalDate start = observationRepository.findFirstBySeriesIdOrderByObservationDateDesc(series.getId())
                    .map(row -> row.getObservationDate().plusDays(1))
                    .orElse(end.minusYears(1));
            if (start.isAfter(end)) {
                log.debug("Macro series güncel, atlandı. code={}", series.getSeriesCode());
                continue;
            }
            try {
                fetchSeries(series, start, end);
            } catch (ExternalApiException e) {
                log.error("Macro series çekme hatası. code={}, cause={}", series.getSeriesCode(), e.getMessage(), e);
            }
        }
    }

    private void fetchSeries(MacroSeries series, LocalDate start, LocalDate end) {
        log.info("EVDS macro çekiliyor. code={}, start={}, end={}", series.getSeriesCode(), start, end);
        String json = evdsClient.fetchSeries(
                series.getSeriesCode(),
                start.format(EVDS_DATE_FORMAT),
                end.format(EVDS_DATE_FORMAT));
        try {
            JsonNode items = objectMapper.readTree(json).path("items");
            if (!items.isArray()) {
                log.warn("EVDS macro yanıtında items yok. code={}", series.getSeriesCode());
                return;
            }
            String valueField = series.getSeriesCode().replace(".", "_");
            int saved = 0;
            int skipped = 0;
            for (JsonNode item : items) {
                LocalDate date = parseDate(item.path("Tarih").asText(null));
                BigDecimal value = parseDecimal(item.path(valueField).asText(null));
                if (date == null || value == null) {
                    skipped++;
                    continue;
                }
                if (observationRepository.existsBySeriesIdAndObservationDate(series.getId(), date)) {
                    skipped++;
                    continue;
                }
                observationRepository.save(MacroObservation.builder()
                        .series(series)
                        .observationDate(date)
                        .value(value)
                        .source("EVDS")
                        .build());
                saved++;
            }
            log.info("Macro series kaydedildi. code={}, saved={}, skipped={}",
                    series.getSeriesCode(), saved, skipped);
        } catch (Exception e) {
            throw new ExternalApiException("EVDS macro JSON parse edilemedi: " + series.getSeriesCode(), e, ServiceType.EVDS);
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("yyyy-M-d")
        );
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(trimmed, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        try {
            return YearMonth.parse(trimmed, DateTimeFormatter.ofPattern("yyyy-M")).atDay(1);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank() || "ND".equalsIgnoreCase(value.trim())) return null;
        try {
            return new BigDecimal(value.trim().replace(",", "."));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
