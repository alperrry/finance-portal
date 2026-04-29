package com.alper.backend.user.drawing.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.user.model.User;
import com.alper.backend.user.drawing.dto.CreateDrawingRequest;
import com.alper.backend.user.drawing.dto.DrawingResponse;
import com.alper.backend.user.drawing.dto.UpdateDrawingRequest;
import com.alper.backend.user.drawing.service.DrawingService;
import com.alper.backend.user.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/drawings")
@Log4j2
@RequiredArgsConstructor
public class DrawingController {

    private final DrawingService drawingService;

    /**
     * Kullanıcının belirli bir enstrümandaki çizimlerini listeler.
     * GET /api/v1/drawings?instrumentType=STOCK&instrumentCode=AKBNK.IS
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DrawingResponse>>> list(
            @CurrentUser User user,
            @RequestParam InstrumentType instrumentType,
            @RequestParam String instrumentCode) {

        ensureAuthenticated(user);
        List<DrawingResponse> drawings = drawingService.listByInstrument(user, instrumentType, instrumentCode);
        return ResponseEntity.ok(ApiResponse.success(drawings));
    }

    /**
     * Yeni çizim oluşturur.
     * POST /api/v1/drawings
     */
    @PostMapping
    public ResponseEntity<ApiResponse<DrawingResponse>> create(
            @CurrentUser User user,
            @Valid @RequestBody CreateDrawingRequest request) {

        ensureAuthenticated(user);
        DrawingResponse created = drawingService.create(user, request);
        return ResponseEntity.ok(ApiResponse.success(created));
    }

    /**
     * Çizim günceller (partial update).
     * PUT /api/v1/drawings/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DrawingResponse>> update(
            @CurrentUser User user,
            @PathVariable Long id,
            @Valid @RequestBody UpdateDrawingRequest request) {

        ensureAuthenticated(user);
        DrawingResponse updated = drawingService.update(user, id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * Tek çizimi siler.
     * DELETE /api/v1/drawings/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> delete(
            @CurrentUser User user,
            @PathVariable Long id) {

        ensureAuthenticated(user);
        drawingService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("deleted", true, "id", id)));
    }

    /**
     * Belirli bir enstrümandaki tüm çizimleri siler.
     * DELETE /api/v1/drawings?instrumentType=STOCK&instrumentCode=AKBNK.IS
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearAll(
            @CurrentUser User user,
            @RequestParam InstrumentType instrumentType,
            @RequestParam String instrumentCode) {

        ensureAuthenticated(user);
        int deletedCount = drawingService.clearAllForInstrument(user, instrumentType, instrumentCode);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "deleted", true,
                "count", deletedCount
        )));
    }

    private void ensureAuthenticated(User user) {
        if (user == null) {
            log.warn("Çizim isteği oturum açmamış kullanıcıdan geldi");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }
    }
}