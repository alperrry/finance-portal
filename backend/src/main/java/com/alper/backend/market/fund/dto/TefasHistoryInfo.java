package com.alper.backend.market.fund.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class TefasHistoryInfo {

    @JsonProperty("TARIH")
    private String tarih;

    @JsonProperty("FONKODU")
    private String fonKodu;

    @JsonProperty("FONUNVAN")
    private String fonUnvan;

    @JsonProperty("FIYAT")
    private BigDecimal fiyat;

    @JsonProperty("TEDPAYSAYISI")
    private BigDecimal tedPaySayisi;

    @JsonProperty("KISISAYISI")
    private BigDecimal kisiSayisi;

    @JsonProperty("PORTFOYBUYUKLUK")
    private BigDecimal portfoyBuyukluk;
}