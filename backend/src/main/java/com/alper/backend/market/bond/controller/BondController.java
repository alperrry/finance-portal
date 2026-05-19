package com.alper.backend.market.bond.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.bond.dto.BondResponse;
import com.alper.backend.market.bond.service.BondQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bonds")
@RequiredArgsConstructor
public class BondController {

    private final BondQueryService bondQueryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BondResponse>>> getAll(
            @RequestParam(defaultValue = "false") boolean includeUnpriced) {
        List<BondResponse> bonds = includeUnpriced
                ? bondQueryService.getAllIncludingUnpriced()
                : bondQueryService.getAll();
        return ResponseEntity.ok(ApiResponse.success(bonds));
    }
}
