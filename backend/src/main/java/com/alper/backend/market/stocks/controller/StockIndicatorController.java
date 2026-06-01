package com.alper.backend.market.stocks.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.stocks.dto.StockIndicatorResponse;
import com.alper.backend.market.stocks.service.StockIndicatorQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Belirli bir hisse senedi için teknik analiz göstergelerini (RSI, MACD, SMA/EMA, Bollinger,
 * Stochastic, ATR, Ichimoku vb.) döner.
 *
 * <p>Hesaplama ve okuma {@link StockIndicatorQueryService} üzerinden yapılır.</p>
 */
@RestController
@RequestMapping("/api/v1/stocks/{symbol}/indicators")
@RequiredArgsConstructor
@Tag(name = "Stock Indicators", description = "Hisse senedi teknik indikatörleri")
public class StockIndicatorController {

    private final StockIndicatorQueryService queryService;

    @GetMapping("/latest")
    @Operation(summary = "En son indikatör değerleri",
            description = "Dashboard için — hissenin en son hesaplanan indikatör satırı")
    public ResponseEntity<ApiResponse<StockIndicatorResponse>> getLatest(
            @PathVariable String symbol) {
        return ResponseEntity.ok(ApiResponse.success(queryService.getLatest(symbol)));
    }

    @GetMapping
    @Operation(summary = "İndikatör geçmişi",
            description = "Grafik için — belirtilen tarih aralığındaki indikatör satırları")
    public ResponseEntity<ApiResponse<List<StockIndicatorResponse>>> getHistory(
            @PathVariable String symbol,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(queryService.getHistory(symbol, from, to)));
    }
}