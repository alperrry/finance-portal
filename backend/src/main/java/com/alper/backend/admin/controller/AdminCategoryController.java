package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.CategoryRequest;
import com.alper.backend.admin.dto.CategoryResponse;
import com.alper.backend.admin.service.AdminCategoryService;
import com.alper.backend.common.web.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin panelinden haber kategorilerini yönetmek için CRUD uç noktaları.
 *
 * <p>{@code ADMIN} rolü gerektirir. Tüm değişiklikler {@link com.alper.backend.admin.audit.AuditService}
 * üzerinden audit log'a yazılır.</p>
 */
@RestController
@RequestMapping("/api/v1/admin/categories")
@RequiredArgsConstructor
@Log4j2
public class AdminCategoryController {

    private final AdminCategoryService adminCategoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> listCategories() {
        return ResponseEntity.ok(ApiResponse.success(adminCategoryService.listCategories()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminCategoryService.getCategory(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CategoryRequest request
    ) {
        log.info("Admin kategori oluşturma talebi | name={}", request.getName());
        CategoryResponse response = adminCategoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request
    ) {
        log.info("Admin kategori güncelleme talebi | id={}", id);
        return ResponseEntity.ok(ApiResponse.success(adminCategoryService.updateCategory(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        log.info("Admin kategori silme talebi | id={}", id);
        adminCategoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}