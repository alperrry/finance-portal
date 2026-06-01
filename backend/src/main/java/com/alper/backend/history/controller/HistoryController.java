package com.alper.backend.history.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.history.dto.CompareResponse;
import com.alper.backend.history.dto.HistoryResponse;
import com.alper.backend.history.service.HistoryQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Enstrümanların (hisse, fon, kur, viop) zaman serisi/tarihsel veri uç noktaları.
 *
 * <p>Grafiklerin ve analiz ekranlarının ihtiyaç duyduğu OHLC ve kapanış serilerini
 * {@link HistoryQueryService} üzerinden döner.</p>
 */
@RestController
@RequestMapping("/api/v1/history")
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryQueryService historyQueryService;

    @GetMapping("/{type}/{code}")
    public ResponseEntity<ApiResponse<HistoryResponse>> getHistory(
            @PathVariable String type,
            @PathVariable String code,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(ApiResponse.success(
                historyQueryService.getHistory(type, code, from, to)));
    }

    @GetMapping("/compare")
    public ResponseEntity<ApiResponse<CompareResponse>> compare(
            @RequestParam String type,
            @RequestParam List<String> codes,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(ApiResponse.success(
                historyQueryService.getCompare(type, codes, from, to)));
    }
}