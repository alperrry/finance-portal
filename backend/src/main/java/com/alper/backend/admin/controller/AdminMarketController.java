package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.BackfillResponse;
import com.alper.backend.admin.service.AdminMarketService;
import com.alper.backend.common.web.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/market")
@RequiredArgsConstructor
@Log4j2
public class AdminMarketController {

    private final AdminMarketService adminMarketService;

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
}