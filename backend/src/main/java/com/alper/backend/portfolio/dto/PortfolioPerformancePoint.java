package com.alper.backend.portfolio.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Portföy performans grafiğinde tek bir tarih-değer noktasını temsil eder.
 */
@Builder
@Schema(description = "Portföy performans grafiği noktası")
public record PortfolioPerformancePoint(
        LocalDate date,
        BigDecimal value,
        BigDecimal benchmarkValue,
        BigDecimal profitLoss
) {
}
