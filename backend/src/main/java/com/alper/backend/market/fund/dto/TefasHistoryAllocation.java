package com.alper.backend.market.fund.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * TEFAS geçmiş verilerindeki portföy dağılım anlık görüntüsünü temsil eder.
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TefasHistoryAllocation {

    @JsonProperty("TARIH")
    @JsonAlias("tarih")
    private String tarih;

    @JsonProperty("FONKODU")
    @JsonAlias("fonKodu")
    private String fonKodu;

    @JsonProperty("FONUNVAN")
    @JsonAlias("fonUnvan")
    private String fonUnvan;

    // Hisse & Borçlanma
    @JsonProperty("HS")
    @JsonAlias("hs")
    private BigDecimal hs;

    @JsonProperty("YHS")
    @JsonAlias("yhs")
    private BigDecimal yhs;

    @JsonProperty("KB")
    @JsonAlias({"kb", "dt"})
    private BigDecimal kb;

    @JsonProperty("DB")
    @JsonAlias("db")
    private BigDecimal ob;

    @JsonProperty("YBKB")
    @JsonAlias("ybkb")
    private BigDecimal ykb;

    @JsonProperty("YBOSB")
    @JsonAlias("ybosb")
    private BigDecimal yob;

    // Para Piyasası & Mevduat
    @JsonProperty("TPP")
    @JsonAlias("tpp")
    private BigDecimal tpp;

    @JsonProperty("VMTL")
    @JsonAlias({"vdm", "vmtl"})
    private BigDecimal vdm;

    @JsonProperty("VDM")
    @JsonAlias("vm")
    private BigDecimal vm;

    @JsonProperty("R")
    @JsonAlias("r")
    private BigDecimal r;

    @JsonProperty("T")
    @JsonAlias({"t", "tr"})
    private BigDecimal t;

    // Döviz & Emtia
    @JsonProperty("D")
    @JsonAlias("d")
    private BigDecimal d;

    @JsonProperty("GAS")
    @JsonAlias({"gas", "km"})
    private BigDecimal gas;

    // Diğer
    @JsonProperty("BYF")
    @JsonAlias("byf")
    private BigDecimal byf;

    @JsonProperty("VİNT")
    @JsonAlias("vint")
    private BigDecimal vint;

    @JsonProperty("DIGER")
    @JsonAlias("diger")
    private BigDecimal diger;
}
