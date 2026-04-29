package com.alper.backend.history.controller;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.alper.backend.history.dto.CompareResponse;
import com.alper.backend.history.dto.HistoryResponse;
import com.alper.backend.history.dto.PricePoint;
import com.alper.backend.history.service.HistoryQueryService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("HistoryController")
class HistoryControllerTest {

    @Mock private HistoryQueryService historyQueryService;

    @InjectMocks private HistoryController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        // Standalone setup — Spring context yüklemiyoruz, sadece controller +
        // GlobalExceptionHandler. Bu sayede test hızlı ve security/auth
        // bağımlılığı yok.
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ============================================================
    // GET /api/v1/history/{type}/{code}
    // ============================================================

    @Nested
    @DisplayName("GET /api/v1/history/{type}/{code}")
    class GetHistoryEndpoint {

        @Test
        @DisplayName("Başarılı yanıt: 200 + ApiResponse<HistoryResponse>")
        void successReturnsWrappedResponse() throws Exception {
            HistoryResponse mockResponse = HistoryResponse.builder()
                    .code("AKBNK.IS")
                    .instrumentType("STOCKS")
                    .from(LocalDate.of(2026, 1, 1))
                    .to(LocalDate.of(2026, 4, 1))
                    .data(List.of(
                            PricePoint.builder()
                                    .date(LocalDate.of(2026, 1, 2))
                                    .close(new BigDecimal("75.50"))
                                    .build(),
                            PricePoint.builder()
                                    .date(LocalDate.of(2026, 1, 3))
                                    .close(new BigDecimal("76.20"))
                                    .build()))
                    .build();

            when(historyQueryService.getHistory(
                    eq("stocks"),
                    eq("AKBNK.IS"),
                    eq(LocalDate.of(2026, 1, 1)),
                    eq(LocalDate.of(2026, 4, 1))))
                    .thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/history/stocks/AKBNK.IS")
                            .param("from", "2026-01-01")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.code").value("AKBNK.IS"))
                    .andExpect(jsonPath("$.data.instrumentType").value("STOCKS"))
                    .andExpect(jsonPath("$.data.data.length()").value(2))
                    .andExpect(jsonPath("$.data.data[0].close").value(75.50));
        }

        @Test
        @DisplayName("Senaryo 4: from > to → 400 + 1003_FP_INVALID_PARAMETER (FR-15)")
        void invalidDateRangeReturnsDocumentErrorCode() throws Exception {
            // Doküman Senaryo 4'ü birebir doğrula:
            // "Beklenen Sonuç: HTTP 400, hata kodu 1003_FP_INVALID_PARAMETER,
            //  mesaj 'Geçersiz parametre değeri. Parametre: from' döner."
            when(historyQueryService.getHistory(
                    eq("stocks"), eq("AKBNK.IS"), any(), any()))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: from"));

            mockMvc.perform(get("/api/v1/history/stocks/AKBNK.IS")
                            .param("from", "2026-04-01")
                            .param("to", "2026-01-01"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                    .andExpect(jsonPath("$.message").value("Geçersiz parametre değeri. Parametre: from"))
                    .andExpect(jsonPath("$.path").value("/api/v1/history/stocks/AKBNK.IS"))
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("Bilinmeyen instrument tipi → 400 + 1003_FP_INVALID_PARAMETER")
        void unknownTypeReturnsBadRequest() throws Exception {
            when(historyQueryService.getHistory(
                    eq("crypto"), anyString(), any(), any()))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: type"));

            mockMvc.perform(get("/api/v1/history/crypto/BTC")
                            .param("from", "2026-01-01")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                    .andExpect(jsonPath("$.message").value("Geçersiz parametre değeri. Parametre: type"));
        }

        @Test
        @DisplayName("Geçersiz tarih formatı → 400 + 1003_FP_INVALID_PARAMETER (Spring tip dönüşüm hatası)")
        void invalidDateFormatReturnsBadRequest() throws Exception {
            // Spring'in @DateTimeFormat parser'ı MethodArgumentTypeMismatchException
            // fırlatır → GlobalExceptionHandler INVALID_PARAMETER'a maple
            mockMvc.perform(get("/api/v1/history/stocks/AKBNK.IS")
                            .param("from", "not-a-date")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("from")));
        }

        @Test
        @DisplayName("Eksik 'to' parametresi → 400 + 1001_FP_REQUIRED_FIELD (FR-08 zorunlu alan)")
        void missingRequiredParamReturnsBadRequest() throws Exception {
            // GlobalExceptionHandler artık MissingServletRequestParameterException'ı
            // doküman'ın REQUIRED_FIELD koduna mapliyor.
            mockMvc.perform(get("/api/v1/history/stocks/AKBNK.IS")
                            .param("from", "2026-01-01"))
                    // 'to' eksik
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1001_FP_REQUIRED_FIELD"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("to")));
        }
    }

    // ============================================================
    // GET /api/v1/history/compare
    // ============================================================

    @Nested
    @DisplayName("GET /api/v1/history/compare")
    class CompareEndpoint {

        @Test
        @DisplayName("Başarılı karşılaştırma: 200 + 3 enstrüman serisi")
        void successComparesThreeInstruments() throws Exception {
            Map<String, List<PricePoint>> series = new LinkedHashMap<>();
            series.put("AKBNK.IS", List.of(
                    PricePoint.builder().date(LocalDate.of(2026, 1, 2)).close(new BigDecimal("75.50")).build()));
            series.put("THYAO.IS", List.of(
                    PricePoint.builder().date(LocalDate.of(2026, 1, 2)).close(new BigDecimal("240.00")).build()));
            series.put("GARAN.IS", List.of(
                    PricePoint.builder().date(LocalDate.of(2026, 1, 2)).close(new BigDecimal("82.30")).build()));

            CompareResponse mockResponse = CompareResponse.builder()
                    .from(LocalDate.of(2026, 1, 1))
                    .to(LocalDate.of(2026, 4, 1))
                    .instrumentType("STOCKS")
                    .series(series)
                    .build();

            when(historyQueryService.getCompare(eq("stocks"), anyList(), any(), any()))
                    .thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/history/compare")
                            .param("type", "stocks")
                            .param("codes", "AKBNK.IS", "THYAO.IS", "GARAN.IS")
                            .param("from", "2026-01-01")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.instrumentType").value("STOCKS"))
                    .andExpect(jsonPath("$.data.series['AKBNK.IS']").exists())
                    .andExpect(jsonPath("$.data.series['THYAO.IS']").exists())
                    .andExpect(jsonPath("$.data.series['GARAN.IS']").exists());
        }

        @Test
        @DisplayName("4+ enstrüman karşılaştırma → 400 + 1003 (FR-17)")
        void tooManyCodesReturnsBadRequest() throws Exception {
            when(historyQueryService.getCompare(
                    eq("stocks"), anyList(), any(), any()))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: codes"));

            mockMvc.perform(get("/api/v1/history/compare")
                            .param("type", "stocks")
                            .param("codes", "A", "B", "C", "D")
                            .param("from", "2026-01-01")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("codes")));
        }

        @Test
        @DisplayName("Boş codes → 400 + 1001 (zorunlu alan)")
        void emptyCodesReturnsRequiredFieldError() throws Exception {
            when(historyQueryService.getCompare(
                    eq("stocks"), anyList(), any(), any()))
                    .thenThrow(new BadRequestException(
                            ErrorCode.REQUIRED_FIELD,
                            "Zorunlu alan boş bırakılamaz. Alan: codes"));

            mockMvc.perform(get("/api/v1/history/compare")
                            .param("type", "stocks")
                            .param("codes", "")
                            .param("from", "2026-01-01")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1001_FP_REQUIRED_FIELD"));
        }
    }

    // ============================================================
    // ApiErrorResponse genel doğrulamaları
    // ============================================================

    @Nested
    @DisplayName("ApiErrorResponse JSON şeması (doküman uyumu)")
    class ErrorResponseSchema {

        @Test
        @DisplayName("Hata yanıtında errorCode, message, timestamp, path, status alanları bulunur")
        void errorResponseHasAllRequiredFields() throws Exception {
            when(historyQueryService.getHistory(
                    eq("stocks"), anyString(), any(), any()))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Test mesajı"));

            mockMvc.perform(get("/api/v1/history/stocks/X")
                            .param("from", "2026-01-01")
                            .param("to", "2026-04-01"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").exists())
                    .andExpect(jsonPath("$.message").exists())
                    .andExpect(jsonPath("$.timestamp").exists())
                    .andExpect(jsonPath("$.path").exists())
                    .andExpect(jsonPath("$.status").exists());
        }
    }
}
