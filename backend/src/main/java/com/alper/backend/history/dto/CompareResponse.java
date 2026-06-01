package com.alper.backend.history.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * İki varlık arasındaki karşılaştırmalı fiyat performansını döndürür.
 */
@Getter
@Builder
public class CompareResponse {
    private LocalDate from;
    private LocalDate to;
    private String instrumentType;
    private Map<String, List<PricePoint>> series;
}