package com.alper.backend.market.fx.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * TCMB döviz kuru XML beslemesindeki tek bir para birimi kaydını temsil eder.
 */
@Getter
@Builder
public class TcmbCurrency {

    private String currencyCode;
    private String currencyName;
    private Integer unit;
    private String forexBuying;
    private String forexSelling;
    private String banknoteBuying;
    private String banknoteSelling;
}