package com.alper.backend.market.fx.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class FxResponse {

    private String currencyCode;
    private String currencyName;
    private Integer unit;
    private BigDecimal forexBuying;
    private BigDecimal forexSelling;
    private LocalDate rateDate;
}