package com.alper.backend.market.stocks.dto;

import lombok.Builder;
import lombok.Getter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
/**
 * Hisse senedi temel ve anlık fiyat verilerini API yanıtı olarak döndürür.
 */
@Builder
public class StockResponse implements Serializable {

    private Long id;
    private String symbol;
    private String shortName;
    private String longName;
    private String sector;
    private String indexName;
    private String instrumentType;
    private String currency;
    private BigDecimal price;
    private BigDecimal change;
    private BigDecimal changePercent;
    private BigDecimal open;
    private BigDecimal dayHigh;
    private BigDecimal dayLow;
    private BigDecimal previousClose;
    private Long volume;
    private Long marketCap;
    private BigDecimal fiftyTwoWeekHigh;
    private BigDecimal fiftyTwoWeekLow;
    private LocalDate tradeDate;
    private LocalDateTime fetchedAt;
}
