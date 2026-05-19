package com.alper.backend.market.fund.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.fund.dto.FundAllocationResponse;
import com.alper.backend.market.fund.dto.FundResponse;
import com.alper.backend.market.fund.service.FundQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/funds")
@RequiredArgsConstructor
public class FundController {

    private final FundQueryService fundQueryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FundResponse>>> getAll(
            @RequestParam(defaultValue = "false") boolean includeUnpriced) {
        List<FundResponse> funds = includeUnpriced
                ? fundQueryService.getAllIncludingUnpriced()
                : fundQueryService.getAll();
        return ResponseEntity.ok(ApiResponse.success(funds));
    }

    @GetMapping("/{code}/allocation")
    public ResponseEntity<ApiResponse<FundAllocationResponse>> getAllocation(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(fundQueryService.getLatestAllocation(code)));
    }
}
