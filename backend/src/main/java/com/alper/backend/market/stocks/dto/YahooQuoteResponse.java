package com.alper.backend.market.stocks.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Yahoo Finance API'sinden alınan fiyat teklif yanıtını taşır.
 */
@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class YahooQuoteResponse {

    private QuoteResponse quoteResponse;

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QuoteResponse {
        private List<YahooQuoteResult> result;
    }
}