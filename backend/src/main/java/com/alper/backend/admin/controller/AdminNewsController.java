package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.AdminNewsCategoryRequest;
import com.alper.backend.admin.dto.AdminNewsStatusRequest;
import com.alper.backend.admin.dto.FetchResponse;
import com.alper.backend.admin.dto.SourceRequest;
import com.alper.backend.admin.dto.SourceResponse;
import com.alper.backend.admin.service.AdminNewsService;
import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.news.dto.NewsResponse;
import com.alper.backend.news.model.NewsStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin panelinden haber kaynaklarını ve haber içeriklerini yönetmek için uç noktalar.
 *
 * <p>Kaynak CRUD, manuel haber çekme tetikleme, haber durumu/kategorisi güncelleme ve
 * silme işlemlerini sağlar. Tüm uç noktalar {@code ADMIN} rolü gerektirir; tüm değişiklikler
 * audit log'a yazılır.</p>
 */
@RestController
@RequestMapping("/api/v1/admin/news")
@RequiredArgsConstructor
@Log4j2
public class AdminNewsController {

    private final AdminNewsService adminNewsService;

    // =========================================================================
    // Kaynak Yönetimi (CRUD)
    // =========================================================================

    @GetMapping("/sources")
    public ResponseEntity<ApiResponse<List<SourceResponse>>> listSources() {
        return ResponseEntity.ok(ApiResponse.success(adminNewsService.listSources()));
    }

    @GetMapping("/sources/{id}")
    public ResponseEntity<ApiResponse<SourceResponse>> getSource(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminNewsService.getSource(id)));
    }

    @PostMapping("/sources")
    public ResponseEntity<ApiResponse<SourceResponse>> createSource(
            @Valid @RequestBody SourceRequest request
    ) {
        log.info("Admin RSS kaynağı oluşturma talebi | url={}", request.sourceUrl());
        SourceResponse response = adminNewsService.createSource(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/sources/{id}")
    public ResponseEntity<ApiResponse<SourceResponse>> updateSource(
            @PathVariable Long id,
            @Valid @RequestBody SourceRequest request
    ) {
        log.info("Admin RSS kaynağı güncelleme talebi | id={}", id);
        return ResponseEntity.ok(ApiResponse.success(adminNewsService.updateSource(id, request)));
    }

    @DeleteMapping("/sources/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSource(@PathVariable Long id) {
        log.info("Admin RSS kaynağı silme talebi | id={}", id);
        adminNewsService.deleteSource(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // =========================================================================
    // Haber Yönetimi
    // =========================================================================

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NewsResponse>>> listNews(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) NewsStatus status,
            @RequestParam(required = false) Long sourceId,
            @RequestParam(required = false) Long categoryId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminNewsService.listNews(search, status, sourceId, categoryId, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NewsResponse>> getNews(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminNewsService.getNews(id)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<NewsResponse>> updateNewsStatus(
            @PathVariable Long id,
            @Valid @RequestBody AdminNewsStatusRequest request
    ) {
        log.info("Admin haber durum güncelleme talebi | id={}, status={}", id, request.status());
        return ResponseEntity.ok(ApiResponse.success(adminNewsService.updateNewsStatus(id, request)));
    }

    @PatchMapping("/{id}/categories")
    public ResponseEntity<ApiResponse<NewsResponse>> updateNewsCategories(
            @PathVariable Long id,
            @Valid @RequestBody AdminNewsCategoryRequest request
    ) {
        log.info("Admin haber kategori güncelleme talebi | id={}", id);
        return ResponseEntity.ok(ApiResponse.success(adminNewsService.updateNewsCategories(id, request)));
    }

    // =========================================================================
    // Manuel Haber Çekimi
    // =========================================================================

    @PostMapping("/fetch")
    public ResponseEntity<ApiResponse<FetchResponse>> fetchAll() {
        log.info("Admin manuel haber çekimi talebi | kaynak=all");
        FetchResponse response = adminNewsService.triggerFetchAll();
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    @PostMapping("/fetch/{sourceId}")
    public ResponseEntity<ApiResponse<FetchResponse>> fetchBySource(@PathVariable Long sourceId) {
        log.info("Admin manuel haber çekimi talebi | sourceId={}", sourceId);
        FetchResponse response = adminNewsService.triggerFetchBySource(sourceId);
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }
}
