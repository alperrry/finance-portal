package com.alper.backend.market.fx.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TcmbCurrency {

    private String currencyCode;
    private String currencyName;
    private Integer unit;
    private String forexBuying;
    private String forexSelling;
}