package com.alper.backend.market.fund.dto;

import lombok.Builder;
import lombok.Getter;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class FundResponse implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String fundType;
    private BigDecimal price;
    private BigDecimal totalShares;
    private Integer investorCount;
    private BigDecimal portfolioSize;
    private LocalDate priceDate;
}
