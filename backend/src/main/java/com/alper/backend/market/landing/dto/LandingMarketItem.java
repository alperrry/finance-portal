package com.alper.backend.market.landing.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class LandingMarketItem {

    private String key;
    private String instrumentType;
    private String symbol;
    private String name;
    private String marketLabel;
    private String currency;
    private BigDecimal price;
    private BigDecimal changePercent;
    private String direction;
    private LocalDate dataDate;
    private LocalDateTime fetchedAt;
}
