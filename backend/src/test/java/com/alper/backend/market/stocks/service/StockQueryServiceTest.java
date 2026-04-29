package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.dto.StockResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StockQueryService")
class StockQueryServiceTest {

    @Mock private StockPriceSnapshotRepository repository;
    private StockQueryService service;

    @BeforeEach
    void setUp() {
        service = new StockQueryService(repository);
    }

    private Stock stock(String symbol, String shortName, String longName, String sector, String index) {
        return Stock.builder()
                .id(1L)
                .symbol(symbol)
                .shortName(shortName)
                .longName(longName)
                .sector(sector)
                .indexName(index)
                .currency("TRY")
                .isActive(true)
                .build();
    }

    private StockPriceSnapshot snapshot(Stock s, String price) {
        return StockPriceSnapshot.builder()
                .stock(s)
                .price(new BigDecimal(price))
                .change(new BigDecimal("0.45"))
                .changePercent(new BigDecimal("0.58"))
                .open(new BigDecimal("78.70"))
                .dayHigh(new BigDecimal("79.15"))
                .dayLow(new BigDecimal("77.60"))
                .previousClose(new BigDecimal("77.45"))
                .volume(92_700_000L)
                .marketCap(450_000_000_000L)
                .fiftyTwoWeekHigh(new BigDecimal("85.20"))
                .fiftyTwoWeekLow(new BigDecimal("45.10"))
                .tradeDate(LocalDate.of(2026, 4, 24))
                .fetchedAt(LocalDateTime.of(2026, 4, 24, 14, 30))
                .build();
    }

    @Test
    @DisplayName("Birden fazla stock snapshot'ı DTO listesine dönüşür")
    void multipleSnapshotsMapToResponseList() {
        Stock akbnk = stock("AKBNK.IS", "AKBNK", "Akbank T.A.S.", "Banking", "BIST30");
        Stock thyao = stock("THYAO.IS", "THYAO", "Türk Hava Yolları", "Airlines", "BIST30");

        when(repository.findTodaySnapshots()).thenReturn(List.of(
                snapshot(akbnk, "77.90"),
                snapshot(thyao, "244.20")
        ));

        List<StockResponse> result = service.getAll();

        assertThat(result).hasSize(2);
        StockResponse first = result.get(0);
        assertThat(first.getSymbol()).isEqualTo("AKBNK.IS");
        assertThat(first.getShortName()).isEqualTo("AKBNK");
        assertThat(first.getLongName()).isEqualTo("Akbank T.A.S.");
        assertThat(first.getSector()).isEqualTo("Banking");
        assertThat(first.getIndexName()).isEqualTo("BIST30");
        assertThat(first.getCurrency()).isEqualTo("TRY");
        assertThat(first.getPrice()).isEqualByComparingTo("77.90");
        assertThat(first.getChange()).isEqualByComparingTo("0.45");
        assertThat(first.getChangePercent()).isEqualByComparingTo("0.58");
        assertThat(first.getDayHigh()).isEqualByComparingTo("79.15");
        assertThat(first.getDayLow()).isEqualByComparingTo("77.60");
        assertThat(first.getVolume()).isEqualTo(92_700_000L);
        assertThat(first.getMarketCap()).isEqualTo(450_000_000_000L);
        assertThat(first.getTradeDate()).isEqualTo(LocalDate.of(2026, 4, 24));
        assertThat(first.getFetchedAt()).isEqualTo(LocalDateTime.of(2026, 4, 24, 14, 30));
    }

    @Test
    @DisplayName("Boş repository sonucu için boş liste döner")
    void emptyRepositoryReturnsEmptyList() {
        when(repository.findTodaySnapshots()).thenReturn(Collections.emptyList());

        List<StockResponse> result = service.getAll();

        assertThat(result).isNotNull().isEmpty();
    }

    @Test
    @DisplayName("Optional alanlar (sector, marketCap) null olabilir")
    void optionalFieldsCanBeNull() {
        Stock s = Stock.builder()
                .id(1L)
                .symbol("TEST.IS")
                .shortName("TEST")
                .longName("Test Stock")
                .sector(null)            // optional
                .indexName("BIST30")
                .currency("TRY")
                .isActive(true)
                .build();

        StockPriceSnapshot snap = StockPriceSnapshot.builder()
                .stock(s)
                .price(new BigDecimal("10.0"))
                .marketCap(null)         // optional
                .volume(null)            // optional
                .tradeDate(LocalDate.of(2026, 4, 24))
                .fetchedAt(LocalDateTime.now())
                .build();

        when(repository.findTodaySnapshots()).thenReturn(List.of(snap));

        List<StockResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSector()).isNull();
        assertThat(result.get(0).getMarketCap()).isNull();
        assertThat(result.get(0).getVolume()).isNull();
    }

    @Test
    @DisplayName("Repository sırası response'ta korunur (alfabetik sıra repo'dan geldiği gibi)")
    void repositoryOrderIsPreserved() {
        Stock s1 = stock("AAA.IS", "AAA", "AAA Corp", "Tech",  "BIST30");
        Stock s2 = stock("BBB.IS", "BBB", "BBB Corp", "Bank",  "BIST30");
        Stock s3 = stock("CCC.IS", "CCC", "CCC Corp", "Retail", "BIST30");

        when(repository.findTodaySnapshots()).thenReturn(List.of(
                snapshot(s2, "100.00"),
                snapshot(s3, "50.00"),
                snapshot(s1, "75.00")
        ));

        List<StockResponse> result = service.getAll();

        assertThat(result).extracting(StockResponse::getSymbol)
                .containsExactly("BBB.IS", "CCC.IS", "AAA.IS");
    }

    @Test
    @DisplayName("Tek snapshot başarıyla dönüşür")
    void singleSnapshotMapsCorrectly() {
        Stock s = stock("AKBNK.IS", "AKBNK", "Akbank T.A.S.", "Banking", "BIST30");
        when(repository.findTodaySnapshots()).thenReturn(List.of(snapshot(s, "77.90")));

        List<StockResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSymbol()).isEqualTo("AKBNK.IS");
        assertThat(result.get(0).getPrice()).isEqualByComparingTo("77.90");
    }
}
