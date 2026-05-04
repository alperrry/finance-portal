package com.alper.backend.portfolio.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
@Schema(description = "Portföy performans grafiği noktası")
public record PortfolioPerformancePoint(
        LocalDate date,
        BigDecimal value,
        BigDecimal benchmarkValue,
        BigDecimal profitLoss
) {
}
