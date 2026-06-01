package com.alper.backend.portfolio.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Açık pozisyonun kapatılması için gerekli fiyat ve tarih bilgisini taşır.
 */
public record ClosePositionRequest(
        @NotNull BigDecimal exitPrice,
        @NotNull LocalDate exitDate,
        @NotNull @DecimalMin("0.000001") BigDecimal quantity
) {}
