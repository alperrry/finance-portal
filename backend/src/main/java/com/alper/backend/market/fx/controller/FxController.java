package com.alper.backend.market.fx.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.market.fx.dto.FxResponse;
import com.alper.backend.market.fx.service.FxQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fx")
@RequiredArgsConstructor
public class FxController {

    private final FxQueryService fxQueryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FxResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(fxQueryService.getAll()));
    }
}