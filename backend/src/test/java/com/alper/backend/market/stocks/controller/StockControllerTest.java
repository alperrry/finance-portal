package com.alper.backend.market.stocks.controller;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.alper.backend.market.stocks.dto.StockResponse;
import com.alper.backend.market.stocks.model.InstrumentType;
import com.alper.backend.market.stocks.service.StockQueryService;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("StockController")
class StockControllerTest {

    @Mock private StockQueryService stockQueryService;

    @InjectMocks private StockController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/stocks")
    class GetAllEndpoint {

        @Test
        @DisplayName("Başarılı yanıt: 200 + ApiResponse<List<StockResponse>>")
        void successReturnsWrappedResponse() throws Exception {
            List<StockResponse> mockResponse = List.of(
                    StockResponse.builder()
                            .symbol("AKBNK.IS")
                            .shortName("Akbank")
                            .longName("Akbank T.A.Ş.")
                            .sector("Bankacılık")
                            .indexName("BIST 30")
                            .instrumentType("STOCK")
                            .currency("TRY")
                            .price(new BigDecimal("78.45"))
                            .change(new BigDecimal("1.25"))
                            .changePercent(new BigDecimal("1.62"))
                            .open(new BigDecimal("77.20"))
                            .dayHigh(new BigDecimal("79.10"))
                            .dayLow(new BigDecimal("76.95"))
                            .previousClose(new BigDecimal("77.20"))
                            .volume(152340000L)
                            .marketCap(410000000000L)
                            .fiftyTwoWeekHigh(new BigDecimal("82.50"))
                            .fiftyTwoWeekLow(new BigDecimal("45.10"))
                            .tradeDate(LocalDate.of(2026, 4, 30))
                            .fetchedAt(LocalDateTime.of(2026, 4, 30, 15, 45, 0))
                            .build(),
                    StockResponse.builder()
                            .symbol("THYAO.IS")
                            .shortName("Türk Hava Yolları")
                            .longName("Türk Hava Yolları A.O.")
                            .sector("Ulaştırma")
                            .indexName("BIST 30")
                            .instrumentType("STOCK")
                            .currency("TRY")
                            .price(new BigDecimal("312.75"))
                            .change(new BigDecimal("-2.10"))
                            .changePercent(new BigDecimal("-0.67"))
                            .open(new BigDecimal("315.00"))
                            .dayHigh(new BigDecimal("316.20"))
                            .dayLow(new BigDecimal("311.40"))
                            .previousClose(new BigDecimal("314.85"))
                            .volume(48210000L)
                            .marketCap(431595000000L)
                            .fiftyTwoWeekHigh(new BigDecimal("355.00"))
                            .fiftyTwoWeekLow(new BigDecimal("210.30"))
                            .tradeDate(LocalDate.of(2026, 4, 30))
                            .fetchedAt(LocalDateTime.of(2026, 4, 30, 15, 45, 0))
                            .build());

            when(stockQueryService.getByInstrumentType(InstrumentType.STOCK)).thenReturn(mockResponse);

            mockMvc.perform(get("/api/v1/stocks"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].symbol").value("AKBNK.IS"))
                    .andExpect(jsonPath("$.data[0].instrumentType").value("STOCK"))
                    .andExpect(jsonPath("$.data[0].price").value(78.45))
                    .andExpect(jsonPath("$.data[0].volume").value(152340000));
        }

        @Test
        @DisplayName("Kaynak bulunamadı → 404 + 2001_FP_NOT_FOUND")
        void notFoundReturnsDocumentErrorCode() throws Exception {
            when(stockQueryService.getByInstrumentType(InstrumentType.STOCK))
                    .thenThrow(new NotFoundException(
                            ErrorCode.NOT_FOUND,
                            "Kaynak bulunamadı. Kaynak: stock"));

            mockMvc.perform(get("/api/v1/stocks"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("2001_FP_NOT_FOUND"))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("Kaynak bulunamadı")))
                    .andExpect(jsonPath("$.path").value("/api/v1/stocks"));
        }

        @Test
        @DisplayName("Geçersiz parametre → 400 + 1003_FP_INVALID_PARAMETER")
        void invalidParameterReturnsBadRequest() throws Exception {
            when(stockQueryService.getByInstrumentType(InstrumentType.STOCK))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Geçersiz parametre değeri. Parametre: type"));

            mockMvc.perform(get("/api/v1/stocks"))
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
            when(stockQueryService.getByInstrumentType(InstrumentType.STOCK))
                    .thenThrow(new BadRequestException(
                            ErrorCode.INVALID_PARAMETER,
                            "Test mesajı"));

            mockMvc.perform(get("/api/v1/stocks"))
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
