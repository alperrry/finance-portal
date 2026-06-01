package com.alper.backend.market.stocks.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.stocks.dto.StockResponse;
import com.alper.backend.market.stocks.model.InstrumentType;
import com.alper.backend.market.stocks.service.StockQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Hisse senedi listeleme, detay, fiyat geçmişi ve snapshot uç noktaları.
 *
 * <p>Read-only; veriyi {@link StockQueryService} üzerinden döner. Veriler Yahoo
 * Finance'tan periyodik {@link com.alper.backend.market.stocks.service.YahooBackfillService}
 * ile beslenir.</p>
 */
@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockQueryService stockQueryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StockResponse>>> getAll(
            @RequestParam(defaultValue = "STOCK") InstrumentType type) {
        return ResponseEntity.ok(ApiResponse.success(stockQueryService.getByInstrumentType(type)));
    }
}
