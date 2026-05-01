package com.alper.backend.integration;

import com.alper.backend.market.common.TurkishHolidayUtil;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("FX Pipeline Integration")
class FxPipelineIntegrationTest extends AbstractIntegrationTest {

    @Test
    @DisplayName("TCMB XML fixture exchange_rate tablosuna yazılır ve FX API üzerinden okunur")
    void tcmbFixtureBackfillsExchangeRatesAndServesThemFromFxApi() throws Exception {
        String fixture = fixture("fixtures/tcmb/today.xml");

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                if (request.getPath() != null && request.getPath().startsWith("/dummy/tcmb")) {
                    return xmlResponse(fixture);
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        tcmbService.fetchAndSave();

        assertThat(exchangeRateRepository.count()).isEqualTo(2);

        mockMvc.perform(get("/api/v1/fx"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].currencyCode").value("EUR"))
                .andExpect(jsonPath("$.data[0].forexSelling").value(35.2010))
                .andExpect(jsonPath("$.data[1].currencyCode").value("USD"))
                .andExpect(jsonPath("$.data[1].forexBuying").value(32.4850));
    }

    @Test
    @DisplayName("TCMB HTTP 503 dönse de mevcut döviz verisi servis edilmeye devam eder")
    void http503KeepsExistingFxDataQueryable() throws Exception {
        LocalDate lastCompleted = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
        insertExchangeRate(
                "USD",
                "US DOLLAR",
                1,
                new BigDecimal("31.9500"),
                new BigDecimal("32.0100"),
                lastCompleted.minusDays(1)
        );
        long countBefore = exchangeRateRepository.count();

        Object originalRetention = ReflectionTestUtils.getField(tcmbBackfillService, "retentionDays");
        ReflectionTestUtils.setField(tcmbBackfillService, "retentionDays", 1);
        try {
            useDispatcher(new Dispatcher() {
                @Override
                public MockResponse dispatch(RecordedRequest request) {
                    if (request.getPath() != null && request.getPath().startsWith("/dummy/tcmb/")) {
                        return new MockResponse()
                                .setResponseCode(503)
                                .addHeader("Content-Type", "application/xml")
                                .setBody("<error>service unavailable</error>");
                    }
                    return new MockResponse().setResponseCode(404);
                }
            });

            assertDoesNotThrow(() -> tcmbBackfillService.backfillIfNeeded());
        } finally {
            ReflectionTestUtils.setField(tcmbBackfillService, "retentionDays", originalRetention);
        }

        assertThat(exchangeRateRepository.count()).isEqualTo(countBefore);

        mockMvc.perform(get("/api/v1/fx"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].currencyCode").value("USD"))
                .andExpect(jsonPath("$.data[0].forexBuying").value(31.9500));
    }
}
