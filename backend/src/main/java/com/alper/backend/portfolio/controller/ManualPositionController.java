package com.alper.backend.portfolio.controller;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.portfolio.dto.ClosePositionRequest;
import com.alper.backend.portfolio.dto.ManualPositionRequest;
import com.alper.backend.portfolio.dto.ManualPositionResponse;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.service.ManualPositionService;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.SimulationResponse;
import com.alper.backend.portfolio.simulation.service.SimulationService;
import com.alper.backend.user.model.User;
import com.alper.backend.user.security.CurrentUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Portföy içindeki manuel pozisyonların (kullanıcı tarafından elle girilen alım/satım)
 * CRUD uç noktaları.
 *
 * <p>What-if simülasyonları için {@link com.alper.backend.portfolio.simulation.service.SimulationService}
 * çağrılarını da içerir. Tüm uç noktalar oturum açmış kullanıcıyı ve verilen
 * {@code portfolioId}'nin bu kullanıcıya ait olduğunu doğrular.</p>
 */
@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/positions")
@RequiredArgsConstructor
@Log4j2
@Tag(name = "ManualPosition", description = "Manuel pozisyon giriş sistemi")
public class ManualPositionController {
    private final SimulationService simulationService;
    private final ManualPositionService manualPositionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ManualPositionResponse> create(
            @PathVariable Long portfolioId,
            @Valid @RequestBody ManualPositionRequest request,
            @CurrentUser User user
    ) {
        log.info("Manuel pozisyon oluşturma isteği. portfolioId={}, userId={}, type={}, kind={}",
                portfolioId, user.getId(), request.instrumentType(), request.positionKind());
        return ApiResponse.success(manualPositionService.create(portfolioId, user.getId(), request));
    }

    @GetMapping
    public ApiResponse<Page<ManualPositionResponse>> list(
            @PathVariable Long portfolioId,
            @RequestParam(defaultValue = "OPEN") PositionKind kind,
            Pageable pageable,
            @CurrentUser User user
    ) {
        return ApiResponse.success(manualPositionService.list(portfolioId, user.getId(), kind, pageable));
    }

    @GetMapping("/{positionId}")
    public ApiResponse<ManualPositionResponse> getById(
            @PathVariable Long portfolioId,
            @PathVariable Long positionId,
            @CurrentUser User user
    ) {
        return ApiResponse.success(manualPositionService.getById(portfolioId, user.getId(), positionId));
    }

    @PostMapping("/{positionId}/close")
    public ApiResponse<List<ManualPositionResponse>> close(
            @PathVariable Long portfolioId,
            @PathVariable Long positionId,
            @Valid @RequestBody ClosePositionRequest request,
            @CurrentUser User user
    ) {
        log.info("Pozisyon kapatma isteği. portfolioId={}, positionId={}, userId={}", portfolioId, positionId, user.getId());
        return ApiResponse.success(manualPositionService.closePosition(portfolioId, user.getId(), positionId, request));
    }

    @DeleteMapping("/{positionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long portfolioId,
            @PathVariable Long positionId,
            @CurrentUser User user
    ) {
        log.info("Manuel pozisyon silme isteği. portfolioId={}, positionId={}, userId={}", portfolioId, positionId, user.getId());
        manualPositionService.delete(portfolioId, user.getId(), positionId);
    }

}
