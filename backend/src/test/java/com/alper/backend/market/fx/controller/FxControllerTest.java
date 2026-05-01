package com.alper.backend.market.fx.controller;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.alper.backend.market.fx.dto.FxResponse;
import com.alper.backend.market.fx.service.FxQueryService;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("FxController")
class FxControllerTest {

    @Mock private FxQueryService fxQueryService;

    @InjectMocks private FxController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/fx")
    class GetAllEndpoint {

        @Test
        @DisplayName("Başarılı yanıt: 200 + ApiResponse<List<FxResponse>>")
        void successReturnsWrappedResponse() throws Exception {
            List<FxResponse> mockResponse = List.of(
                    FxResponse.builder()
                            .currencyCode("USD")
                            .currencyName("US Dollar")
                            .unit(1)
                            .forexBuying(new BigDecimal("38.1200"))
                            .forexSelling(new BigDecimal("38.2200"))
                            .rateDate(LocalDate.of(2026, 4, 30))
                            .build(),
                    FxResponse.builder()
                            .currencyCode("EUR")
                            .currencyName("Euro")
                            .unit(1)
                            .forexBuying(new BigDecimal("41.0800"))
                            .forexSelling(new BigDecimal("41.2300"))
                            .rateDate(LocalDate.of(2026, 4, 30))
                            .build());

            when(fxQueryService.getAll()).thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/fx"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].currencyCode").value("USD"))
                    .andExpect(jsonPath("$.data[0].currencyName").value("US Dollar"))
                    .andExpect(jsonPath("$.data[0].forexBuying").value(38.12));
        }

        @Test
        @DisplayName("Kaynak bulunamadı → 404 + 2001_FP_NOT_FOUND")
        void notFoundReturnsDocumentErrorCode() throws Exception {
            when(fxQueryService.getAll())
                    .thenThrow(new NotFoundException(
                            ErrorCode.NOT_FOUND,
                            "Kaynak bulunamadı. Kaynak: fx"));

            mockMvc.perform(get("/api/v1/fx"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("2001_FP_NOT_FOUND"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("Kaynak bulunamadı")))
                    .andExpect(jsonPath("$.path").value("/api/v1/fx"));
        }

        @Test
        @DisplayName("Geçersiz parametre → 400 + 1003_FP_INVALID_PARAMETER")
        void invalidParameterReturnsBadRequest() throws Exception {
            when(fxQueryService.getAll())
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: type"));

            mockMvc.perform(get("/api/v1/fx"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.startsWith("Geçersiz parametre değeri.")));
        }
    }

    @Nested
    @DisplayName("ApiErrorResponse JSON şeması")
    class ErrorResponseSchema {

        @Test
        @DisplayName("Hata yanıtında errorCode, message, timestamp, path, status alanları bulunur")
        void errorResponseHasAllRequiredFields() throws Exception {
            when(fxQueryService.getAll())
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Test mesajı"));

            mockMvc.perform(get("/api/v1/fx"))
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
