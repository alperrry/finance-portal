package com.alper.backend.market.bond.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class EvdsItem {

    @JsonProperty("Tarih")
    private String tarih;

    // Seri kodu dinamik olduğu için raw map ile değil,
    // servis katmanında manuel parse edilecek
}