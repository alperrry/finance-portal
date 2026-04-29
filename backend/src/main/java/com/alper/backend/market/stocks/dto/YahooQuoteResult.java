package com.alper.backend.market.stocks.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class YahooQuoteResult {

    private String symbol;
    private Double regularMarketPrice;
    private Double regularMarketChange;
    private Double regularMarketChangePercent;
    private Double regularMarketOpen;
    private Double regularMarketDayHigh;
    private Double regularMarketDayLow;
    private Double regularMarketPreviousClose;
    private Long regularMarketVolume;
    private Long marketCap;
    private Double fiftyTwoWeekHigh;
    private Double fiftyTwoWeekLow;
}
