package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.BackfillResponse;
import com.alper.backend.admin.service.AdminMarketClearService;
import com.alper.backend.admin.service.AdminMarketService;
import com.alper.backend.common.web.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin panelinden piyasa veri modüllerini elle backfill etmek ve içeriklerini temizlemek
 * için uç noktalar (fx, stocks, bonds, funds, macro, viop).
 *
 * <p>Backfill çağrıları asenkron tetiklenir ve {@code 202 ACCEPTED} döner.
 * Tüm uç noktalar {@code ADMIN} rolü gerektirir.</p>
 */
@RestController
@RequestMapping("/api/v1/admin/market")
@RequiredArgsConstructor
@Log4j2
public class AdminMarketController {

    private final AdminMarketService adminMarketService;
    private final AdminMarketClearService adminMarketClearService;

    @PostMapping("/backfill/fx")
    public ResponseEntity<ApiResponse<BackfillResponse>> triggerFxBackfill() {
        log.info("Admin manuel backfill talebi | modül=fx");
        BackfillResponse response = adminMarketService.triggerFxBackfill();
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    @PostMapping("/backfill/stocks")
    public ResponseEntity<ApiResponse<BackfillResponse>> triggerStocksBackfill() {
        log.info("Admin manuel backfill talebi | modül=stocks");
        BackfillResponse response = adminMarketService.triggerStocksBackfill();
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    @PostMapping("/backfill/bonds")
    public ResponseEntity<ApiResponse<BackfillResponse>> triggerBondsBackfill() {
        log.info("Admin manuel backfill talebi | modül=bonds");
        BackfillResponse response = adminMarketService.triggerBondsBackfill();
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    @PostMapping("/backfill/funds")
    public ResponseEntity<ApiResponse<BackfillResponse>> triggerFundsBackfill() {
        log.info("Admin manuel backfill talebi | modül=funds");
        BackfillResponse response = adminMarketService.triggerFundsBackfill();
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    @PostMapping("/backfill/macro")
    public ResponseEntity<ApiResponse<BackfillResponse>> triggerMacroBackfill() {
        log.info("Admin manuel backfill talebi | modül=macro");
        BackfillResponse response = adminMarketService.triggerMacroBackfill();
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    @PostMapping("/backfill/viop")
    public ResponseEntity<ApiResponse<BackfillResponse>> triggerViopBackfill() {
        log.info("Admin manuel backfill talebi | modül=viop");
        BackfillResponse response = adminMarketService.triggerViopBackfill();
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    @DeleteMapping("/clear/{module}")
    public ResponseEntity<ApiResponse<Long>> clearMarketData(@PathVariable String module) {
        log.warn("Admin market data temizleme talebi | modül={}", module);
        long deleted = switch (module) {
            case "fx"     -> adminMarketClearService.clearFx();
            case "stocks" -> adminMarketClearService.clearStocks();
            case "bonds"  -> adminMarketClearService.clearBonds();
            case "funds"  -> adminMarketClearService.clearFunds();
            case "macro"  -> adminMarketClearService.clearMacro();
            case "viop"   -> adminMarketClearService.clearViop();
            default -> throw new IllegalArgumentException("Bilinmeyen modül: " + module);
        };
        return ResponseEntity.ok(ApiResponse.success(deleted));
    }
}
