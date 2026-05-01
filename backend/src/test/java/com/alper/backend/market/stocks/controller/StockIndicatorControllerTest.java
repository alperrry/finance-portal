package com.alper.backend.market.stocks.controller;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.alper.backend.market.stocks.dto.StockIndicatorResponse;
import com.alper.backend.market.stocks.service.StockIndicatorQueryService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("StockIndicatorController")
class StockIndicatorControllerTest {

    @Mock private StockIndicatorQueryService queryService;

    @InjectMocks private StockIndicatorController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/stocks/{symbol}/indicators/latest")
    class GetLatestEndpoint {

        @Test
        @DisplayName("Başarılı yanıt: 200 + ApiResponse<StockIndicatorResponse>")
        void successReturnsWrappedResponse() throws Exception {
            StockIndicatorResponse mockResponse = StockIndicatorResponse.builder()
                    .symbol("AKBNK.IS")
                    .tradeDate(LocalDate.of(2026, 4, 24))
                    .rsi14(new BigDecimal("59.30"))
                    .macdLine(new BigDecimal("1.330000"))
                    .macdSignal(new BigDecimal("1.250000"))
                    .sma20(new BigDecimal("76.5000"))
                    .sma50(new BigDecimal("72.1000"))
                    .sma200(new BigDecimal("65.4000"))
                    .ema12(new BigDecimal("77.0000"))
                    .ema26(new BigDecimal("75.3000"))
                    .build();

            when(queryService.getLatest(eq("AKBNK.IS"))).thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/stocks/AKBNK.IS/indicators/latest"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.symbol").value("AKBNK.IS"))
                    .andExpect(jsonPath("$.data.rsi14").value(59.30))
                    .andExpect(jsonPath("$.data.sma20").value(76.5000))
                    .andExpect(jsonPath("$.data.macdLine").value(1.33));
        }

        @Test
        @DisplayName("Bilinmeyen symbol → 404 + 2001_FP_NOT_FOUND")
        void unknownSymbolReturnsNotFound() throws Exception {
            when(queryService.getLatest(eq("UNKNOWN.IS")))
                    .thenThrow(new NotFoundException(
                            ErrorCode.NOT_FOUND,
                            "Kaynak bulunamadı. Kaynak: stock"));

            mockMvc.perform(get("/api/v1/stocks/UNKNOWN.IS/indicators/latest"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("2001_FP_NOT_FOUND"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("Kaynak bulunamadı")))
                    .andExpect(jsonPath("$.path")
                            .value("/api/v1/stocks/UNKNOWN.IS/indicators/latest"));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/stocks/{symbol}/indicators")
    class GetHistoryEndpoint {

        @Test
        @DisplayName("Başarılı yanıt: 200 + ApiResponse<List<StockIndicatorResponse>>")
        void successReturnsWrappedList() throws Exception {
            List<StockIndicatorResponse> mockResponse = List.of(
                    StockIndicatorResponse.builder()
                            .symbol("AKBNK.IS")
                            .tradeDate(LocalDate.of(2026, 4, 22))
                            .rsi14(new BigDecimal("55.10"))
                            .macdLine(new BigDecimal("1.120000"))
                            .sma20(new BigDecimal("75.4000"))
                            .ema12(new BigDecimal("75.9000"))
                            .build(),
                    StockIndicatorResponse.builder()
                            .symbol("AKBNK.IS")
                            .tradeDate(LocalDate.of(2026, 4, 23))
                            .rsi14(new BigDecimal("57.80"))
                            .macdLine(new BigDecimal("1.240000"))
                            .sma20(new BigDecimal("75.9000"))
                            .ema12(new BigDecimal("76.4000"))
                            .build());

            when(queryService.getHistory(
                    eq("AKBNK.IS"),
                    eq(LocalDate.of(2026, 4, 22)),
                    eq(LocalDate.of(2026, 4, 23))))
                    .thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/stocks/AKBNK.IS/indicators")
                            .param("from", "2026-04-22")
                            .param("to", "2026-04-23"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].symbol").value("AKBNK.IS"))
                    .andExpect(jsonPath("$.data[0].rsi14").value(55.10))
                    .andExpect(jsonPath("$.data[0].sma20").value(75.4000));
        }

        @Test
        @DisplayName("from > to → 400 + 1003_FP_INVALID_PARAMETER")
        void invalidDateRangeReturnsBadRequest() throws Exception {
            when(queryService.getHistory(eq("AKBNK.IS"), any(), any()))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: from"));

            mockMvc.perform(get("/api/v1/stocks/AKBNK.IS/indicators")
                            .param("from", "2026-04-24")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.startsWith("Geçersiz parametre değeri.")))
                    .andExpect(jsonPath("$.path").value("/api/v1/stocks/AKBNK.IS/indicators"));
        }

        @Test
        @DisplayName("Geçersiz tarih formatı → 400 + 1003_FP_INVALID_PARAMETER")
        void invalidDateFormatReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/api/v1/stocks/AKBNK.IS/indicators")
                            .param("from", "not-a-date")
                            .param("to", "2026-04-23"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("from")))
                    .andExpect(jsonPath("$.path").value("/api/v1/stocks/AKBNK.IS/indicators"));
        }

        @Test
        @DisplayName("Eksik 'to' parametresi → 400 + 1001_FP_REQUIRED_FIELD")
        void missingRequiredToParamReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/api/v1/stocks/AKBNK.IS/indicators")
                            .param("from", "2026-04-22"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1001_FP_REQUIRED_FIELD"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("to")))
                    .andExpect(jsonPath("$.path").value("/api/v1/stocks/AKBNK.IS/indicators"));
        }
    }

    @Nested
    @DisplayName("ApiErrorResponse JSON şeması")
    class ErrorResponseSchema {

        @Test
        @DisplayName("Hata yanıtında errorCode, message, timestamp, path, status alanları bulunur")
        void errorResponseHasAllRequiredFields() throws Exception {
            when(queryService.getLatest(anyString()))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Test mesajı"));

            mockMvc.perform(get("/api/v1/stocks/X/indicators/latest"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").exists())
                    .andExpect(jsonPath("$.message").exists())
                    .andExpect(jsonPath("$.timestamp").exists())
                    .andExpect(jsonPath("$.path").exists())
                    .andExpect(jsonPath("$.status").exists())
                    .andExpect(jsonPath("$.status").value(400));
        }
    }
}
