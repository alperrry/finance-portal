package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.BackfillResponse;
import com.alper.backend.admin.service.AdminMarketClearService;
import com.alper.backend.admin.service.AdminMarketService;
import com.alper.backend.common.web.GlobalExceptionHandler;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminMarketController Testleri")
class AdminMarketControllerTest {

    @Mock private AdminMarketService adminMarketService;
    @Mock private AdminMarketClearService adminMarketClearService;

    @InjectMocks private AdminMarketController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("POST /api/v1/admin/market/backfill/{module}")
    class BackfillEndpoints {

        @Test
        @DisplayName("202 — fx backfill tetiklenir")
        void triggerFxBackfill_returns202() throws Exception {
            when(adminMarketService.triggerFxBackfill())
                    .thenReturn(BackfillResponse.triggered("fx"));

            mockMvc.perform(post("/api/v1/admin/market/backfill/fx"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.data.status").value("TRIGGERED"))
                    .andExpect(jsonPath("$.data.module").value("fx"));
        }

        @Test
        @DisplayName("202 — stocks backfill tetiklenir")
        void triggerStocksBackfill_returns202() throws Exception {
            when(adminMarketService.triggerStocksBackfill())
                    .thenReturn(BackfillResponse.triggered("stocks"));

            mockMvc.perform(post("/api/v1/admin/market/backfill/stocks"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.data.module").value("stocks"));
        }

        @Test
        @DisplayName("202 — bonds backfill tetiklenir")
        void triggerBondsBackfill_returns202() throws Exception {
            when(adminMarketService.triggerBondsBackfill())
                    .thenReturn(BackfillResponse.triggered("bonds"));

            mockMvc.perform(post("/api/v1/admin/market/backfill/bonds"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.data.module").value("bonds"));
        }

        @Test
        @DisplayName("202 — funds backfill tetiklenir")
        void triggerFundsBackfill_returns202() throws Exception {
            when(adminMarketService.triggerFundsBackfill())
                    .thenReturn(BackfillResponse.triggered("funds"));

            mockMvc.perform(post("/api/v1/admin/market/backfill/funds"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.data.module").value("funds"));
        }

        @Test
        @DisplayName("202 — zaten çalışıyorsa ALREADY_RUNNING döner")
        void triggerFxBackfill_whenRunning_returns202AlreadyRunning() throws Exception {
            when(adminMarketService.triggerFxBackfill())
                    .thenReturn(BackfillResponse.alreadyRunning("fx"));

            mockMvc.perform(post("/api/v1/admin/market/backfill/fx"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.data.status").value("ALREADY_RUNNING"));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/admin/market/clear/{module}")
    class ClearEndpoints {

        @Test
        @DisplayName("200 — fx verileri temizlenir ve sayı döner")
        void clearFx_returns200WithDeletedCount() throws Exception {
            when(adminMarketClearService.clearFx()).thenReturn(150L);

            mockMvc.perform(delete("/api/v1/admin/market/clear/fx"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value(150));
        }

        @Test
        @DisplayName("200 — stocks verileri temizlenir")
        void clearStocks_returns200WithDeletedCount() throws Exception {
            when(adminMarketClearService.clearStocks()).thenReturn(1500L);

            mockMvc.perform(delete("/api/v1/admin/market/clear/stocks"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value(1500));
        }
    }
}
