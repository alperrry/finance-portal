package com.alper.backend.market.fund.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * TEFAS API'sinden alınan ham fon verisini taşır.
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TefasResponse<T> {

    @JsonProperty("draw")
    private int draw;

    @JsonProperty("recordsTotal")
    private int recordsTotal;

    @JsonProperty("recordsFiltered")
    private int recordsFiltered;

    @JsonProperty("data")
    @JsonAlias("resultList")
    private List<T> data;

    @JsonProperty("errorCode")
    private String errorCode;

    @JsonProperty("errorMessage")
    private String errorMessage;

    @JsonProperty("toplamSayi")
    private Integer totalCount;

    @JsonProperty("toplamSayfa")
    @JsonAlias("totalPages")
    private Integer totalPages;
}
