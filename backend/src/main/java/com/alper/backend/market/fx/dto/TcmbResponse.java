package com.alper.backend.market.fx.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

/**
 * TCMB döviz kuru XML beslemesinin tamamını temsil eder.
 */
@Getter
@Builder
public class TcmbResponse {

    private LocalDate rateDate;
    private List<TcmbCurrency> currencies;
}