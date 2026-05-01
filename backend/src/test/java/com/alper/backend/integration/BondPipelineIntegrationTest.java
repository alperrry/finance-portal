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

@DisplayName("Bond Pipeline Integration")
class BondPipelineIntegrationTest extends AbstractIntegrationTest {

    private static final String SERIES_CODE = "TP.TRD210826F19.ORAN";
    private static final String EMPTY_EVDS_RESPONSE = "{\"totalCount\":0,\"items\":[]}";

    @Test
    @DisplayName("EVDS fixture bond history tablosuna yazılır ve Bond API üzerinden okunur")
    void evdsFixtureBackfillsBondHistoryAndServesItFromBondApi() throws Exception {
        String fixture = fixture("fixtures/evds/bond-trd210826f19.json");

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                if (path == null) {
                    return new MockResponse().setResponseCode(404);
                }
                if (path.startsWith("/dummy/evds/series=" + SERIES_CODE)) {
                    return jsonResponse(fixture);
                }
                if (path.startsWith("/dummy/evds/series=")) {
                    return jsonResponse(EMPTY_EVDS_RESPONSE);
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        evdsService.fetchAndSave(SERIES_CODE, "02-01-2026", "03-01-2026");

        assertThat(bondRateHistoryRepository.count()).isEqualTo(2);

        mockMvc.perform(get("/api/v1/bonds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].evdsSeriesCode").value(SERIES_CODE))
                .andExpect(jsonPath("$.data[0].interestRate").value(42.9157))
                .andExpect(jsonPath("$.data[0].rateDate").value("2026-01-03"));
    }

    @Test
    @DisplayName("EVDS timeout olsa da mevcut bond verisi kullanıcıya sunulmaya devam eder")
    void timeoutKeepsExistingBondDataQueryable() throws Exception {
        insertBondRate(SERIES_CODE, LocalDate.now().minusDays(3), new BigDecimal("41.1234"));
        long countBefore = bondRateHistoryRepository.count();

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                if (path == null) {
                    return new MockResponse().setResponseCode(404);
                }
                if (path.startsWith("/dummy/evds/series=" + SERIES_CODE)) {
                    return new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE);
                }
                if (path.startsWith("/dummy/evds/series=")) {
                    return new MockResponse().setResponseCode(503);
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        assertDoesNotThrow(() -> bondBackfillService.backfillIfEmpty());

        assertThat(bondRateHistoryRepository.count()).isEqualTo(countBefore);

        mockMvc.perform(get("/api/v1/bonds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].evdsSeriesCode").value(SERIES_CODE))
                .andExpect(jsonPath("$.data[0].interestRate").value(41.1234));
    }
}
