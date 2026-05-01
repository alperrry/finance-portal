package com.alper.backend.market.fund.controller;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.alper.backend.market.fund.dto.FundResponse;
import com.alper.backend.market.fund.service.FundQueryService;
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
@DisplayName("FundController")
class FundControllerTest {

    @Mock private FundQueryService fundQueryService;

    @InjectMocks private FundController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/funds")
    class GetAllEndpoint {

        @Test
        @DisplayName("Başarılı yanıt: 200 + ApiResponse<List<FundResponse>>")
        void successReturnsWrappedResponse() throws Exception {
            List<FundResponse> mockResponse = List.of(
                    FundResponse.builder()
                            .code("AFT")
                            .name("Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu")
                            .fundType("HİSSE SENEDİ")
                            .price(new BigDecimal("0.245678"))
                            .totalShares(new BigDecimal("125000000.00"))
                            .investorCount(45210)
                            .portfolioSize(new BigDecimal("30750000.00"))
                            .priceDate(LocalDate.of(2026, 4, 30))
                            .build(),
                    FundResponse.builder()
                            .code("YAY")
                            .name("Yapı Kredi Altın Fonu")
                            .fundType("KIYMETLİ MADENLER")
                            .price(new BigDecimal("1.543210"))
                            .totalShares(new BigDecimal("98000000.00"))
                            .investorCount(31870)
                            .portfolioSize(new BigDecimal("151200000.00"))
                            .priceDate(LocalDate.of(2026, 4, 30))
                            .build());

            when(fundQueryService.getAll()).thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/funds"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].code").value("AFT"))
                    .andExpect(jsonPath("$.data[0].name").value(
                            "Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu"))
                    .andExpect(jsonPath("$.data[0].price").value(0.245678));
        }

        @Test
        @DisplayName("Kaynak bulunamadı → 404 + 2001_FP_NOT_FOUND")
        void notFoundReturnsDocumentErrorCode() throws Exception {
            when(fundQueryService.getAll())
                    .thenThrow(new NotFoundException(
                            ErrorCode.NOT_FOUND,
                            "Kaynak bulunamadı. Kaynak: fund"));

            mockMvc.perform(get("/api/v1/funds"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("2001_FP_NOT_FOUND"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("Kaynak bulunamadı")))
                    .andExpect(jsonPath("$.path").value("/api/v1/funds"));
        }

        @Test
        @DisplayName("Geçersiz parametre → 400 + 1003_FP_INVALID_PARAMETER")
        void invalidParameterReturnsBadRequest() throws Exception {
            when(fundQueryService.getAll())
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: type"));

            mockMvc.perform(get("/api/v1/funds"))
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
            when(fundQueryService.getAll())
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Test mesajı"));

            mockMvc.perform(get("/api/v1/funds"))
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
