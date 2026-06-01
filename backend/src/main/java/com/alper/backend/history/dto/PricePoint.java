package com.alper.backend.history.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
/**
 * Fiyat geçmişinde tek bir tarih-değer noktasını temsil eder.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PricePoint {
    private LocalDate date;
    private BigDecimal open;
    private BigDecimal high;
    private BigDecimal low;
    private BigDecimal close;
    private Long volume;
}