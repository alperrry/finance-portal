package com.alper.backend.history.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class HistoryResponse {
    private String code;
    private String instrumentType;
    private LocalDate from;
    private LocalDate to;
    private List<PricePoint> data;
}