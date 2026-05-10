package com.alper.backend.market.fund.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TefasHistoryInfo {

    @JsonProperty("TARIH")
    @JsonAlias("tarih")
    private String tarih;

    @JsonProperty("FONKODU")
    @JsonAlias("fonKodu")
    private String fonKodu;

    @JsonProperty("FONUNVAN")
    @JsonAlias("fonUnvan")
    private String fonUnvan;

    @JsonProperty("FIYAT")
    @JsonAlias("fiyat")
    private BigDecimal fiyat;

    @JsonProperty("TEDPAYSAYISI")
    @JsonAlias("tedPaySayisi")
    private BigDecimal tedPaySayisi;

    @JsonProperty("KISISAYISI")
    @JsonAlias("kisiSayisi")
    private BigDecimal kisiSayisi;

    @JsonProperty("PORTFOYBUYUKLUK")
    @JsonAlias("portfoyBuyukluk")
    private BigDecimal portfoyBuyukluk;
}
