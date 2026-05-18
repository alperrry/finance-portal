package com.alper.backend.market.viop.dto;

import lombok.Builder;
import lombok.Getter;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Builder
public class ViopContractPriceResponse implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
    private Long id;
    private String marketSegment;
    private String contractName;
    private String underlyingSymbol;
    private String maturityText;
    private BigDecimal lastPrice;
    private BigDecimal changePercent;
    private BigDecimal changeAmount;
    private BigDecimal volumeTry;
    private Long volumeQuantity;
    private LocalDate tradeDate;
    private OffsetDateTime fetchedAt;
}
