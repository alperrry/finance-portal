package com.alper.backend.market.stocks.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.stocks.dto.StockResponse;
import com.alper.backend.market.stocks.service.StockQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockQueryService stockQueryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StockResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(stockQueryService.getAll()));
    }
}