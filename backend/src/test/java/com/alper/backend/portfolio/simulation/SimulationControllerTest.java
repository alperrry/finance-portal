package com.alper.backend.portfolio.simulation;

import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.alper.backend.portfolio.simulation.controller.SimulationController;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.PositionSummary;
import com.alper.backend.portfolio.simulation.model.SimulationResponse;
import com.alper.backend.portfolio.simulation.service.SimulationService;
import com.alper.backend.user.model.User;
import com.alper.backend.user.security.CurrentUserArgumentResolver;
import com.alper.backend.user.security.UserProvisioningFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("SimulationController")
class SimulationControllerTest {

    @Mock private SimulationService simulationService;

    @InjectMocks private SimulationController controller;

    private MockMvc mockMvc;

    private static final User TEST_USER = User.builder().id(1L).keycloakId("test-kc-id")
            .username("testuser").build();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new CurrentUserArgumentResolver())
                .build();
    }

    private SimulationResponse stubResponse() {
        PositionSummary summary = new PositionSummary(1L, "AKBNK.IS", "Akbank",
                InstrumentType.STOCK, BigDecimal.TEN, LocalDate.of(2025, 1, 1), "OPEN");

        LensResult baseline = new LensResult(LensType.NOMINAL_TRY,
                new BigDecimal("4500.00"), new BigDecimal("5000.00"),
                new BigDecimal("500.00"), new BigDecimal("11.11"),
                "TRY", null, null, null);

        LensResult usdResult = new LensResult(LensType.USD,
                new BigDecimal("150.00"), new BigDecimal("158.73"),
                new BigDecimal("8.73"), new BigDecimal("5.82"),
                "USD", new BigDecimal("30.00"), new BigDecimal("31.50"), LocalDate.now());

        return new SimulationResponse(summary, baseline, Map.of(LensType.USD, usdResult));
    }

    @Nested
    @DisplayName("GET /api/v1/portfolio/manual-positions/{positionId}/simulation")
    class SimulateManualPositionEndpoint {

        @Test
        @DisplayName("200 + başarılı yanıt döner")
        void success_returns200() throws Exception {
            when(simulationService.simulateManualPosition(anyLong(), anyList(), anyLong()))
                    .thenReturn(stubResponse());

            mockMvc.perform(get("/api/v1/portfolio/manual-positions/5/simulation")
                            .param("lens", "USD")
                            .requestAttr(UserProvisioningFilter.CURRENT_USER_ATTRIBUTE, TEST_USER))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.lenses.USD.currency").value("USD"));
        }

        @Test
        @DisplayName("404 — position bulunamazsa NOT_FOUND döner")
        void notFound_returns404() throws Exception {
            when(simulationService.simulateManualPosition(anyLong(), anyList(), anyLong()))
                    .thenThrow(new NotFoundException("position"));

            mockMvc.perform(get("/api/v1/portfolio/manual-positions/999/simulation")
                            .param("lens", "USD")
                            .requestAttr(UserProvisioningFilter.CURRENT_USER_ATTRIBUTE, TEST_USER))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("2001_FP_NOT_FOUND"));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/portfolio/manual-positions/{positionId}/what-if")
    class WhatIfEndpoint {

        @Test
        @DisplayName("200 + başarılı yanıt döner")
        void success_returns200() throws Exception {
            when(simulationService.simulateWhatIfScenario(anyLong(), any(), anyString(), anyList(), anyLong()))
                    .thenReturn(stubResponse());

            mockMvc.perform(get("/api/v1/portfolio/manual-positions/5/what-if")
                            .param("targetType", "CURRENCY")
                            .param("targetSymbol", "USD")
                            .param("lens", "NOMINAL_TRY")
                            .requestAttr(UserProvisioningFilter.CURRENT_USER_ATTRIBUTE, TEST_USER))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.baseline.currency").value("TRY"));
        }

        @Test
        @DisplayName("lens parametresi verilmezse varsayılan NOMINAL_TRY kullanılır ve 200 döner")
        void defaultLens_returns200() throws Exception {
            when(simulationService.simulateWhatIfScenario(anyLong(), any(), anyString(), anyList(), anyLong()))
                    .thenReturn(stubResponse());

            mockMvc.perform(get("/api/v1/portfolio/manual-positions/5/what-if")
                            .param("targetType", "CURRENCY")
                            .param("targetSymbol", "EUR")
                            .requestAttr(UserProvisioningFilter.CURRENT_USER_ATTRIBUTE, TEST_USER))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("404 — position bulunamazsa NOT_FOUND döner")
        void notFound_returns404() throws Exception {
            when(simulationService.simulateWhatIfScenario(anyLong(), any(), anyString(), anyList(), anyLong()))
                    .thenThrow(new NotFoundException("position"));

            mockMvc.perform(get("/api/v1/portfolio/manual-positions/999/what-if")
                            .param("targetType", "CURRENCY")
                            .param("targetSymbol", "USD")
                            .requestAttr(UserProvisioningFilter.CURRENT_USER_ATTRIBUTE, TEST_USER))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("2001_FP_NOT_FOUND"));
        }
    }
}
