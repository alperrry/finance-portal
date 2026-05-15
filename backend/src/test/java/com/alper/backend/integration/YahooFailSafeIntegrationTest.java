package com.alper.backend.integration;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.RecordedRequest;
import okhttp3.mockwebserver.SocketPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Yahoo Fail-Safe Integration")
class YahooFailSafeIntegrationTest extends AbstractIntegrationTest {

    @Test
    @DisplayName("Yahoo timeout olsa da mevcut history verisi kullanıcıya sunulmaya devam eder")
    void timeoutKeepsExistingSnapshotQueryable() throws Exception {
        activateOnlySymbol("AKBNK.IS");
        insertHistorySeries("AKBNK.IS", LocalDate.now().minusDays(5), 3, new BigDecimal("78.00"));
        insertSnapshot("AKBNK.IS", new BigDecimal("82.45"));
        long historyCountBefore = historyRepository.count();

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                if (request.getPath() != null && request.getPath().startsWith("/v8/finance/chart/AKBNK.IS")) {
                    return new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE);
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        assertDoesNotThrow(() -> yahooBackfillService.backfillIfEmpty());

        assertThat(historyRepository.count()).isEqualTo(historyCountBefore);

        mockMvc.perform(get("/api/v1/stocks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].symbol").value("AKBNK.IS"))
                .andExpect(jsonPath("$.data[0].price").value(80.00));
    }

    @Test
    @DisplayName("Yahoo HTTP 503 dönse de mevcut veri servis edilmeye devam eder ve yeni history eklenmez")
    void http503KeepsExistingDataAndDoesNotInsertNewHistory() throws Exception {
        activateOnlySymbol("AKBNK.IS");
        insertHistorySeries("AKBNK.IS", LocalDate.now().minusDays(6), 3, new BigDecimal("79.00"));
        insertSnapshot("AKBNK.IS", new BigDecimal("83.10"));
        long historyCountBefore = historyRepository.count();

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                if (request.getPath() != null && request.getPath().startsWith("/v8/finance/chart/AKBNK.IS")) {
                    return new MockResponse()
                            .setResponseCode(503)
                            .addHeader("Content-Type", "application/json")
                            .setBody("{\"error\":\"service unavailable\"}");
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        assertDoesNotThrow(() -> yahooBackfillService.backfillIfEmpty());

        assertThat(historyRepository.count()).isEqualTo(historyCountBefore);

        mockMvc.perform(get("/api/v1/stocks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].symbol").value("AKBNK.IS"))
                .andExpect(jsonPath("$.data[0].price").value(81.00));
    }

    @Test
    @DisplayName("Yahoo bağlantısı reddedilse de sistem ayakta kalır ve mevcut history verisi döner")
    void connectionRefusedStillLeavesApiOperational() throws Exception {
        activateOnlySymbol("AKBNK.IS");
        insertHistorySeries("AKBNK.IS", LocalDate.now().minusDays(4), 2, new BigDecimal("81.00"));
        insertSnapshot("AKBNK.IS", new BigDecimal("84.20"));
        long historyCountBefore = historyRepository.count();

        mockWebServer.shutdown();

        assertDoesNotThrow(() -> yahooBackfillService.backfillIfEmpty());

        assertThat(historyRepository.count()).isEqualTo(historyCountBefore);

        mockMvc.perform(get("/api/v1/stocks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].symbol").value("AKBNK.IS"))
                .andExpect(jsonPath("$.data[0].price").value(82.00));
    }
}
