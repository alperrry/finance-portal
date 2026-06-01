package com.alper.backend.admin.controller;

import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.service.AdminAuditLogService;
import com.alper.backend.common.web.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin panelinden audit log girişlerini sorgulamak için uç noktalar.
 *
 * <p>Sayfalı/filtreli okuma sağlar; tüm uç noktalar {@code ADMIN} rolü gerektirir.</p>
 */
@RestController
@RequestMapping("/api/v1/admin/audit")
@RequiredArgsConstructor
public class AdminAuditLogController {

    private final AdminAuditLogService adminAuditLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLog>>> list(
            @RequestParam(required = false) List<String> targetType,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminAuditLogService.list(targetType, pageable)));
    }
}
