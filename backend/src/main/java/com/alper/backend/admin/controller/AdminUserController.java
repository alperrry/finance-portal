package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.AdminUserDetailResponse;
import com.alper.backend.admin.dto.AdminUserListResponse;
import com.alper.backend.admin.dto.ResetUser2FaRequest;
import com.alper.backend.admin.dto.UpdateUserRoleRequest;
import com.alper.backend.admin.dto.UpdateUserStatusRequest;
import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.service.AdminUserService;
import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.user.model.UserRole;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


/**
 * Admin panelinden son kullanıcıları yönetmek için uç noktalar.
 *
 * <p>Listeleme/arama, detay, rol değişikliği, durum (aktif/pasif) güncelleme ve 2FA
 * sıfırlama işlemlerini sağlar. Tüm değişiklikler audit log'a yazılır ve {@code ADMIN}
 * rolü gerektirir.</p>
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Log4j2
public class AdminUserController {

    private final AdminUserService adminUserService;


    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminUserListResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        Page<AdminUserListResponse> result = adminUserService.list(search, role, active, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }


    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<AdminUserDetailResponse>> getDetail(
            @PathVariable Long userId
    ) {
        AdminUserDetailResponse response = adminUserService.getDetail(userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }


    @PatchMapping("/{userId}/role")
    public ResponseEntity<ApiResponse<AdminUserDetailResponse>> updateRole(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        log.info("Admin rol güncelleme talebi | userId={} | newRole={}",
                userId, request.newRole());
        AdminUserDetailResponse response = adminUserService.updateRole(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }


    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<AdminUserDetailResponse>> updateStatus(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        log.info("Admin durum güncelleme talebi | userId={} | active={}",
                userId, request.active());
        AdminUserDetailResponse response = adminUserService.updateStatus(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{userId}/reset-2fa")
    public ResponseEntity<ApiResponse<Void>> reset2Fa(
            @PathVariable Long userId,
            @Valid @RequestBody ResetUser2FaRequest request
    ) {
        log.info("Admin 2FA sıfırlama talebi | userId={}", userId);
        adminUserService.reset2Fa(userId, request.reason());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

   
    @GetMapping("/{userId}/audit-trail")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getAuditTrail(
            @PathVariable Long userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        Page<AuditLog> result = adminUserService.getAuditTrail(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
