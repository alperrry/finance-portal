package com.alper.backend.market.viop.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.viop.dto.ViopContractPriceResponse;
import com.alper.backend.market.viop.service.ViopQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/viop")
@RequiredArgsConstructor
public class ViopController {
    private final ViopQueryService viopQueryService;

    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<List<ViopContractPriceResponse>>> getLatest() {
        return ResponseEntity.ok(ApiResponse.success(viopQueryService.getLatest()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ViopContractPriceResponse>>> getAll(
            @RequestParam(required = false) String segment,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(viopQueryService.getAll(segment, from, to)));
    }
}
