package com.alper.backend.market.bond.dto;

import com.alper.backend.market.bond.model.BondType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class BondResponse {

    private String evdsSeriesCode;
    private String name;
    private BondType bondType;
    private Integer maturityDays;
    private String currency;
    private BigDecimal interestRate;
    private BigDecimal compoundedRate;
    private LocalDate rateDate;
}