package com.alper.backend.market.fund.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class TefasResponse<T> {

    @JsonProperty("draw")
    private int draw;

    @JsonProperty("recordsTotal")
    private int recordsTotal;

    @JsonProperty("recordsFiltered")
    private int recordsFiltered;

    @JsonProperty("data")
    private List<T> data;
}