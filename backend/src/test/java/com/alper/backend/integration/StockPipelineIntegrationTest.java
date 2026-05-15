package com.alper.backend.integration;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Stock Pipeline Integration")
class StockPipelineIntegrationTest extends AbstractIntegrationTest {

    @Test
    @DisplayName("Yahoo chart fixture backfill ile history tablosuna yazılır ve History API üzerinden okunur")
    void backfillWritesHistoryAndServesItFromHistoryApi() throws Exception {
        String chartFixture = fixture("fixtures/yahoo/chart-akbnk-30d.json");

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                if (request.getPath() != null && request.getPath().startsWith("/v8/finance/chart/AKBNK.IS")) {
                    return jsonResponse(chartFixture);
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        yahooService.fetchAndSaveHistoryForBackfill(stock("AKBNK.IS"));

        assertThat(historyRepository.count()).isEqualTo(30);

        mockMvc.perform(get("/api/v1/history/stocks/AKBNK.IS")
                        .param("from", "2026-03-02")
                        .param("to", "2026-03-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("AKBNK.IS"))
                .andExpect(jsonPath("$.data.data.length()").value(30))
                .andExpect(jsonPath("$.data.data[0].close").value(70.10))
                .andExpect(jsonPath("$.data.data[29].close").value(99.10));
    }

    @Test
    @DisplayName("Yahoo chart fixture history tablosuna yazılır ve Stock API üzerinden okunur")
    void quoteWritesSnapshotAndServesItFromStockApi() throws Exception {
        activateOnlySymbol("AKBNK.IS");
        String chartFixture = fixture("fixtures/yahoo/chart-akbnk-30d.json");

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                if (path == null) {
                    return new MockResponse().setResponseCode(404);
                }
                if (path.startsWith("/v8/finance/chart/AKBNK.IS")) {
                    return jsonResponse(chartFixture);
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        yahooService.fetchAndSaveSnapshot();

        assertThat(snapshotRepository.count()).isZero();
        assertThat(historyRepository.count()).isEqualTo(30);

        mockMvc.perform(get("/api/v1/stocks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].symbol").value("AKBNK.IS"))
                .andExpect(jsonPath("$.data[0].price").value(99.10));
    }

    @Test
    @DisplayName("Yeterli history verisi ile indicator hesaplanır ve latest indicator API üzerinden okunur")
    void indicatorCalculationProducesLatestIndicatorApiResponse() throws Exception {
        insertHistorySeries("AKBNK.IS", LocalDate.now().minusDays(39), 40, new BigDecimal("50.00"));

        stockIndicatorService.recalculateForStock(stock("AKBNK.IS"));

        assertThat(indicatorRepository.count()).isGreaterThan(0);

        mockMvc.perform(get("/api/v1/stocks/AKBNK.IS/indicators/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.symbol").value("AKBNK.IS"))
                .andExpect(jsonPath("$.data.rsi14").isNumber())
                .andExpect(jsonPath("$.data.sma20").isNumber());
    }
}
