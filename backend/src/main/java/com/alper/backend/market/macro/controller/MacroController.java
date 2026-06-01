package com.alper.backend.market.macro.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.macro.dto.MacroObservationResponse;
import com.alper.backend.market.macro.service.MacroQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Makroekonomik veri uç noktaları (TÜFE, faiz vb.).
 *
 * <p>Veriler TCMB EVDS'ten çekilir; okuma {@link MacroQueryService} üzerinden yapılır.</p>
 */
@RestController
@RequestMapping("/api/v1/macro")
@RequiredArgsConstructor
public class MacroController {
    private final MacroQueryService macroQueryService;

    @GetMapping("/inflation")
    public ResponseEntity<ApiResponse<List<MacroObservationResponse>>> getInflation(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(macroQueryService.getInflation(from, to)));
    }

    @GetMapping("/deposit-rates")
    public ResponseEntity<ApiResponse<List<MacroObservationResponse>>> getDepositRates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(macroQueryService.getDepositRates(from, to)));
    }

}
