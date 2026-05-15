package com.alper.backend.market.macro.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class MacroObservationResponse {
    private Long seriesId;
    private String seriesCode;
    private String name;
    private String dataType;
    private LocalDate date;
    private BigDecimal value;
    private BigDecimal monthlyChangePercent;
    private BigDecimal annualChangePercent;
    private String unit;
}
