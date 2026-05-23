package com.alper.backend.portfolio.simulation.controller;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.SimulationResponse;
import com.alper.backend.portfolio.simulation.service.SimulationService;
import com.alper.backend.user.model.User;
import com.alper.backend.user.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolio")
@RequiredArgsConstructor
@Tag(name = "Simulation", description = "Pozisyon simülasyonu (USD lens)")
public class SimulationController {

    private final SimulationService simulationService;

    @GetMapping("/manual-positions/{positionId}/simulation")
    @Operation(summary = "Manuel pozisyon simülasyonu", description = "ManualPosition için lens bazlı simülasyon")
    public ApiResponse<SimulationResponse> simulateManualPosition(
            @PathVariable Long positionId,
            @RequestParam List<LensType> lens,
            @CurrentUser User user) {
        return ApiResponse.success(simulationService.simulateManualPosition(positionId, lens, user.getId()));
    }
    @GetMapping("/manual-positions/{positionId}/what-if")
    @Operation(summary = "What-if simülasyonu", description = "Alternatif enstrüman senaryosu")
    public ApiResponse<SimulationResponse> simulateWhatIf(
            @PathVariable Long positionId,
            @RequestParam InstrumentType targetType,
            @RequestParam String targetSymbol,
            @RequestParam(name = "lens", required = false) List<LensType> lenses,
            @CurrentUser User user) {
        if (lenses == null) {
            lenses = List.of();
        }
        return ApiResponse.success(simulationService.simulateWhatIfScenario(
                positionId, targetType, targetSymbol, lenses, user.getId()));
    }
}
