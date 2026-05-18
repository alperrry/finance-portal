package com.alper.backend.market.macro.dto;

import lombok.Builder;
import lombok.Getter;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class MacroObservationResponse implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
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
