package com.alper.backend.market.bond.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class EvdsResponse {

    @JsonProperty("totalCount")
    private Integer totalCount;

    // Her item: {"Tarih": "02-01-2026", "TP_DK_USD_A": "42.84570000", "UNIXTIME": {...}}
    // Seri kodu dinamik olduğu için Map olarak alıyoruz
    @JsonProperty("items")
    private List<Map<String, Object>> items;
}