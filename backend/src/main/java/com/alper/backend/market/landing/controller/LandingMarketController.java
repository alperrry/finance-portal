package com.alper.backend.market.landing.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.landing.dto.LandingMarketSnapshot;
import com.alper.backend.market.landing.service.LandingMarketSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/landing/market-snapshot")
@RequiredArgsConstructor
public class LandingMarketController {

    private final LandingMarketSnapshotService landingMarketSnapshotService;

    @GetMapping
    public ResponseEntity<ApiResponse<LandingMarketSnapshot>> getMarketSnapshot() {
        return ResponseEntity.ok(ApiResponse.success(landingMarketSnapshotService.getSnapshot()));
    }
}
