package com.alper.backend.integration;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Fund Pipeline Integration")
class FundPipelineIntegrationTest extends AbstractIntegrationTest {

    private static final String FUND_CODE = "MAC";

    @Test
    @DisplayName("TEFAS cookie ve data fixture'ları fund tablolarına yazılır ve Fund API üzerinden okunur")
    void tefasFixturesBackfillFundTablesAndServeThemFromFundApi() throws Exception {
        String infoFixture = fixture("fixtures/tefas/history-info-mac.json");
        String allocationFixture = fixture("fixtures/tefas/history-allocation-mac.json");

        useDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                if (path == null) {
                    return new MockResponse().setResponseCode(404);
                }
                if (path.startsWith("/dummy/tefas/fon-verileri")) {
                    return new MockResponse()
                            .setResponseCode(200)
                            .addHeader("Set-Cookie", "TEFASSESSION=test-cookie; Path=/; HttpOnly")
                            .addHeader("Content-Type", "text/html")
                            .setBody("<html>ok</html>");
                }
                if (path.startsWith("/api/funds/fonGnlBlgSiraliGetir")) {
                    return jsonResponse(infoFixture);
                }
                if (path.startsWith("/api/funds/dagilimSiraliGetirT")) {
                    return jsonResponse(allocationFixture);
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        tefasService.fetchAndSaveForDate(FUND_CODE, LocalDate.of(2026, 4, 24), LocalDate.of(2026, 4, 24));

        assertThat(fundPriceRepository.count()).isEqualTo(1);
        assertThat(fundAllocationRepository.count()).isEqualTo(1);

        mockMvc.perform(get("/api/v1/funds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].code").value(FUND_CODE))
                .andExpect(jsonPath("$.data[0].price").value(12.345678))
                .andExpect(jsonPath("$.data[0].investorCount").value(15000))
                .andExpect(jsonPath("$.data[0].priceDate").value("2026-04-24"));
    }

    @Test
    @DisplayName("TEFAS bağlantısı reddedilse de mevcut fon verisi servis edilmeye devam eder")
    void connectionRefusedKeepsExistingFundDataQueryable() throws Exception {
        insertFundPrice(FUND_CODE, LocalDate.now().minusDays(2), new BigDecimal("11.987654"));
        long priceCountBefore = fundPriceRepository.count();

        mockWebServer.shutdown();

        assertDoesNotThrow(() -> tefasBackfillService.backfillIfEmpty());

        assertThat(fundPriceRepository.count()).isEqualTo(priceCountBefore);

        mockMvc.perform(get("/api/v1/funds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].code").value(FUND_CODE))
                .andExpect(jsonPath("$.data[0].price").value(11.987654));
    }
}
