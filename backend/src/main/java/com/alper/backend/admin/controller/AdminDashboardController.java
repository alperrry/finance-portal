package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.DashboardSummaryResponse;
import com.alper.backend.admin.service.AdminDashboardService;
import com.alper.backend.common.web.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin paneli ana ekranı (dashboard) için operasyonel özet uç noktası.
 *
 * <p>Genel sayımlar ve piyasa veri tazeliğini tek çağrıda döner. {@code ADMIN} rolü
 * gerektirir (SecurityConfig {@code /api/v1/admin/**} altını korur).</p>
 */
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Log4j2
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getSummary() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getSummary()));
    }
}
