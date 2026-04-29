package com.alper.backend.market.fx.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class TcmbResponse {

    private LocalDate rateDate;
    private List<TcmbCurrency> currencies;
}