package com.alper.backend.market.fund.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class TefasHistoryAllocation {

    @JsonProperty("TARIH")
    private String tarih;

    @JsonProperty("FONKODU")
    private String fonKodu;

    @JsonProperty("FONUNVAN")
    private String fonUnvan;

    // Hisse & Borçlanma
    @JsonProperty("HS")
    private BigDecimal hs;

    @JsonProperty("YHS")
    private BigDecimal yhs;

    @JsonProperty("KB")
    private BigDecimal kb;

    @JsonProperty("DB")
    private BigDecimal ob;

    @JsonProperty("YBKB")
    private BigDecimal ykb;

    @JsonProperty("YBOSB")
    private BigDecimal yob;

    // Para Piyasası & Mevduat
    @JsonProperty("TPP")
    private BigDecimal tpp;

    @JsonProperty("VMTL")
    private BigDecimal vdm;

    @JsonProperty("VDM")
    private BigDecimal vm;

    @JsonProperty("R")
    private BigDecimal r;

    @JsonProperty("T")
    private BigDecimal t;

    // Döviz & Emtia
    @JsonProperty("D")
    private BigDecimal d;

    @JsonProperty("GAS")
    private BigDecimal gas;

    // Diğer
    @JsonProperty("BYF")
    private BigDecimal byf;

    @JsonProperty("VİNT")
    private BigDecimal vint;

    @JsonProperty("DIGER")
    private BigDecimal diger;
}