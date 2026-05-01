package com.alper.backend.integration;

import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("History Pipeline Integration")
class HistoryPipelineIntegrationTest extends AbstractIntegrationTest {

    private static final LocalDate SEED_START = LocalDate.of(2026, 1, 1);
    private static final int SEED_DAYS = 30;
    private static final LocalDate SEED_END = SEED_START.plusDays(SEED_DAYS - 1L);

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private StockPriceHistoryRepository historyRepository;

    @Test
    @DisplayName("3 enstrüman compare end-to-end — FR-17 happy path")
    void compareThreeInstrumentsReturnsAllSeries() throws Exception {
        Stock akbnk = seedStock("AKBNK.IS");
        Stock thyao = seedStock("THYAO.IS");
        Stock garan = seedStock("GARAN.IS");

        seedHistory(akbnk, SEED_START, SEED_DAYS, new BigDecimal("50.00"));
        seedHistory(thyao, SEED_START, SEED_DAYS, new BigDecimal("200.00"));
        seedHistory(garan, SEED_START, SEED_DAYS, new BigDecimal("80.00"));

        mockMvc.perform(get("/api/v1/history/compare")
                        .param("type", "stocks")
                        .param("codes", "AKBNK.IS", "THYAO.IS", "GARAN.IS")
                        .param("from", SEED_START.toString())
                        .param("to", SEED_END.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.series['AKBNK.IS']").exists())
                .andExpect(jsonPath("$.data.series['AKBNK.IS'].length()").value(greaterThan(0)))
                .andExpect(jsonPath("$.data.series['THYAO.IS']").exists())
                .andExpect(jsonPath("$.data.series['GARAN.IS']").exists())
                .andExpect(jsonPath("$.data.series['AKBNK.IS'][0].close").isNumber())
                .andExpect(jsonPath("$.data.instrumentType").value("STOCKS"));
    }

    @Test
    @DisplayName("Senaryo 4: from > to → 1003_FP_INVALID_PARAMETER")
    void compareWithInvertedDateRangeReturnsInvalidParameter() throws Exception {
        mockMvc.perform(get("/api/v1/history/compare")
                        .param("type", "stocks")
                        .param("codes", "AKBNK.IS")
                        .param("from", "2026-04-01")
                        .param("to", "2026-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("1003_FP_INVALID_PARAMETER"))
                .andExpect(jsonPath("$.message", startsWith("Geçersiz parametre değeri.")))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.path").value("/api/v1/history/compare"))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("Tek enstrüman tarihsel veri end-to-end — FR-15/FR-16")
    void singleInstrumentHistoryReturnsData() throws Exception {
        Stock akbnk = seedStock("AKBNK.IS");
        seedHistory(akbnk, SEED_START, SEED_DAYS, new BigDecimal("50.00"));

        mockMvc.perform(get("/api/v1/history/stocks/AKBNK.IS")
                        .param("from", SEED_START.toString())
                        .param("to", SEED_END.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("AKBNK.IS"))
                .andExpect(jsonPath("$.data.data.length()").value(greaterThan(0)))
                .andExpect(jsonPath("$.data.data[0].close").isNumber());
    }

    @Test
    @DisplayName("Boş tarih aralığı — veri yoksa boş liste döner (FR-16)")
    void emptyDateRangeReturnsEmptyList() throws Exception {
        seedStock("AKBNK.IS");

        mockMvc.perform(get("/api/v1/history/stocks/AKBNK.IS")
                        .param("from", "2030-01-01")
                        .param("to", "2030-02-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data.length()").value(0));
    }

    private Stock seedStock(String symbol) {
        return stockRepository.findBySymbol(symbol)
                .orElseGet(() -> stockRepository.save(Stock.builder()
                        .symbol(symbol)
                        .shortName(symbol.replace(".IS", ""))
                        .longName(symbol + " Test")
                        .sector("Test")
                        .industry("Test")
                        .exchange("IST")
                        .currency("TRY")
                        .indexName("BIST30")
                        .isActive(true)
                        .build()));
    }

    private void seedHistory(Stock stock, LocalDate from, int days, BigDecimal basePrice) {
        List<StockPriceHistory> rows = new ArrayList<>();

        for (int i = 0; i < days; i++) {
            BigDecimal close = basePrice.add(new BigDecimal("0.75").multiply(BigDecimal.valueOf(i)));
            rows.add(StockPriceHistory.builder()
                    .stock(stock)
                    .tradeDate(from.plusDays(i))
                    .openPrice(close.subtract(new BigDecimal("0.45")))
                    .highPrice(close.add(new BigDecimal("1.10")))
                    .lowPrice(close.subtract(new BigDecimal("1.20")))
                    .closePrice(close)
                    .adjClose(close)
                    .volume(1_500_000L + (i * 25_000L))
                    .build());
        }

        historyRepository.saveAll(rows);
    }
}
