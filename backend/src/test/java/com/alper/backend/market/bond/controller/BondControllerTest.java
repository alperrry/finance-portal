package com.alper.backend.market.bond.controller;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.alper.backend.market.bond.dto.BondResponse;
import com.alper.backend.market.bond.model.BondType;
import com.alper.backend.market.bond.service.BondQueryService;
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

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("BondController")
class BondControllerTest {

    @Mock private BondQueryService bondQueryService;

    @InjectMocks private BondController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/bonds")
    class GetAllEndpoint {

        @Test
        @DisplayName("Başarılı yanıt: 200 + ApiResponse<List<BondResponse>>")
        void successReturnsWrappedResponse() throws Exception {
            List<BondResponse> mockResponse = List.of(
                    BondResponse.builder()
                            .evdsSeriesCode("TRB080328T15")
                            .name("2 Yıllık Gösterge Tahvil")
                            .bondType(BondType.DEVLET_TAHVIL)
                            .maturityDays(730)
                            .currency("TRY")
                            .interestRate(new BigDecimal("42.15"))
                            .compoundedRate(new BigDecimal("44.60"))
                            .rateDate(LocalDate.of(2026, 4, 30))
                            .build(),
                    BondResponse.builder()
                            .evdsSeriesCode("TRB150129T18")
                            .name("6 Aylık Bono")
                            .bondType(BondType.HAZINE_BONOSU)
                            .maturityDays(180)
                            .currency("TRY")
                            .interestRate(new BigDecimal("38.40"))
                            .compoundedRate(new BigDecimal("39.10"))
                            .rateDate(LocalDate.of(2026, 4, 30))
                            .build());

            when(bondQueryService.getAll()).thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/bonds"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].evdsSeriesCode").value("TRB080328T15"))
                    .andExpect(jsonPath("$.data[0].interestRate").value(42.15))
                    .andExpect(jsonPath("$.data[0].bondType").value("DEVLET_TAHVIL"));

            verify(bondQueryService).getAll();
            verify(bondQueryService, never()).getAllIncludingUnpriced();
        }

        @Test
        @DisplayName("includeUnpriced=true rate kaydı olmayan tahvilleri de isteyen servis metodunu çağırır")
        void includeUnpricedUsesAllBondsService() throws Exception {
            List<BondResponse> mockResponse = List.of(
                    BondResponse.builder()
                            .evdsSeriesCode("TP.UNPRICED.ORAN")
                            .name("Fiyatsız Tahvil")
                            .bondType(BondType.HAZINE_BONOSU)
                            .maturityDays(180)
                            .currency("TRY")
                            .build());

            when(bondQueryService.getAllIncludingUnpriced()).thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/bonds").param("includeUnpriced", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(1))
                    .andExpect(jsonPath("$.data[0].evdsSeriesCode").value("TP.UNPRICED.ORAN"))
                    .andExpect(jsonPath("$.data[0].interestRate").value(org.hamcrest.Matchers.nullValue()));

            verify(bondQueryService).getAllIncludingUnpriced();
            verify(bondQueryService, never()).getAll();
        }

        @Test
        @DisplayName("Kaynak bulunamadı → 404 + 2001_FP_NOT_FOUND")
        void notFoundReturnsDocumentErrorCode() throws Exception {
            when(bondQueryService.getAll())
                    .thenThrow(new NotFoundException(
                            ErrorCode.NOT_FOUND,
                            "Kaynak bulunamadı. Kaynak: bond"));

            mockMvc.perform(get("/api/v1/bonds"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("2001_FP_NOT_FOUND"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("Kaynak bulunamadı")))
                    .andExpect(jsonPath("$.path").value("/api/v1/bonds"));
        }

        @Test
        @DisplayName("Geçersiz parametre → 400 + 1003_FP_INVALID_PARAMETER")
        void invalidParameterReturnsBadRequest() throws Exception {
            when(bondQueryService.getAll())
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: type"));

            mockMvc.perform(get("/api/v1/bonds"))
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
            when(bondQueryService.getAll())
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Test mesajı"));

            mockMvc.perform(get("/api/v1/bonds"))
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
