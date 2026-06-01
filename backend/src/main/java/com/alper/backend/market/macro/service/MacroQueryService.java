package com.alper.backend.market.macro.service;

import com.alper.backend.market.macro.dto.MacroObservationResponse;
import com.alper.backend.market.macro.model.MacroDataType;
import com.alper.backend.market.macro.model.MacroObservation;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Makro veri okuma servisi: enflasyon ve benzeri seri sorguları.
 *
 * <p>Read-only; {@link com.alper.backend.market.macro.repository.MacroObservationRepository}'den
 * verileri çeker, filtresiz aramaları {@code macro} cache'inde tutar.</p>
 */
@Service
@RequiredArgsConstructor
public class MacroQueryService {
    private final MacroObservationRepository observationRepository;

    @Cacheable(value = "macro", key = "'inflation'", condition = "#from == null && #to == null")
    public List<MacroObservationResponse> getInflation(LocalDate from, LocalDate to) {
        return getByType(MacroDataType.INFLATION, from, to);
    }

    @Cacheable(value = "macro", key = "'deposit-rates'", condition = "#from == null && #to == null")
    public List<MacroObservationResponse> getDepositRates(LocalDate from, LocalDate to) {
        return getByType(MacroDataType.DEPOSIT_RATE, from, to);
    }

    private List<MacroObservationResponse> getByType(MacroDataType type, LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            List<MacroObservation> latestRows = observationRepository.findLatestByActiveSeriesDataType(type);
            return latestRows.stream()
                    .map(row -> toResponse(row, observationRepository
                            .findBySeries_SeriesCodeAndObservationDateBetweenOrderByObservationDateAsc(
                                    row.getSeries().getSeriesCode(),
                                    row.getObservationDate().minusYears(1),
                                    row.getObservationDate())))
                    .toList();
        }

        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusYears(1);
        List<MacroObservation> rows = observationRepository
                .findBySeries_DataTypeAndObservationDateBetweenOrderBySeries_DisplayNameAscObservationDateAsc(
                        type, effectiveFrom.minusYears(1), effectiveTo);

        Map<Long, List<MacroObservation>> bySeries = new HashMap<>();
        for (MacroObservation row : rows) {
            bySeries.computeIfAbsent(row.getSeries().getId(), ignored -> new java.util.ArrayList<>()).add(row);
        }

        return rows.stream()
                .filter(row -> !row.getObservationDate().isBefore(effectiveFrom))
                .map(row -> toResponse(row, bySeries.get(row.getSeries().getId())))
                .toList();
    }

    private MacroObservationResponse toResponse(MacroObservation row, List<MacroObservation> seriesRows) {
        BigDecimal previousMonth = findValueMonthsBefore(seriesRows, row, 1);
        BigDecimal previousYear = findValueMonthsBefore(seriesRows, row, 12);
        return MacroObservationResponse.builder()
                .seriesId(row.getSeries().getId())
                .seriesCode(row.getSeries().getSeriesCode())
                .name(row.getSeries().getDisplayName())
                .dataType(row.getSeries().getDataType().name())
                .date(row.getObservationDate())
                .value(row.getValue())
                .monthlyChangePercent(pctChange(row.getValue(), previousMonth))
                .annualChangePercent(pctChange(row.getValue(), previousYear))
                .unit(row.getSeries().getUnit())
                .build();
    }

    private BigDecimal findValueMonthsBefore(List<MacroObservation> rows, MacroObservation current, int months) {
        if (rows == null) return null;
        LocalDate target = current.getObservationDate().minusMonths(months);
        return rows.stream()
                .filter(row -> row.getObservationDate().getYear() == target.getYear()
                        && row.getObservationDate().getMonth() == target.getMonth())
                .findFirst()
                .map(MacroObservation::getValue)
                .orElse(null);
    }

    private BigDecimal pctChange(BigDecimal current, BigDecimal previous) {
        if (current == null || previous == null || previous.compareTo(BigDecimal.ZERO) == 0) return null;
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 4, RoundingMode.HALF_UP);
    }
}
