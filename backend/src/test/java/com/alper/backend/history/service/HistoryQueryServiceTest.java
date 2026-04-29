package com.alper.backend.history.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.history.dto.CompareResponse;
import com.alper.backend.history.dto.HistoryResponse;
import com.alper.backend.history.dto.PricePoint;
import com.alper.backend.history.mapper.HistoryMapper;
import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("HistoryQueryService")
class HistoryQueryServiceTest {

    @Mock private StockPriceHistoryRepository stockHistoryRepository;
    @Mock private ExchangeRateRepository exchangeRateRepository;
    @Mock private FundPriceRepository fundPriceRepository;
    @Mock private BondRateHistoryRepository bondRateHistoryRepository;

    // Mapper'ı GERÇEK kullanıyoruz — zaten test edilmiş, davranışını biliyoruz
    private HistoryMapper historyMapper;

    private HistoryQueryService service;

    private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
    private static final LocalDate TO   = LocalDate.of(2026, 4, 1);

    @BeforeEach
    void setUp() {
        historyMapper = new HistoryMapper();
        service = new HistoryQueryService(
                stockHistoryRepository,
                exchangeRateRepository,
                fundPriceRepository,
                bondRateHistoryRepository,
                historyMapper);
    }

    // ------------- Helpers -------------

    private StockPriceHistory stockBar(LocalDate date, double close) {
        return StockPriceHistory.builder()
                .stock(Stock.builder().symbol("AKBNK.IS").build())
                .tradeDate(date)
                .openPrice(BigDecimal.valueOf(close))
                .highPrice(BigDecimal.valueOf(close))
                .lowPrice(BigDecimal.valueOf(close))
                .closePrice(BigDecimal.valueOf(close))
                .volume(1_000_000L)
                .build();
    }

    private ExchangeRate fxRow(LocalDate date, double selling) {
        return ExchangeRate.builder()
                .currencyCode("USD")
                .currencyName("US DOLLAR")
                .unit(1)
                .forexBuying(BigDecimal.valueOf(selling - 0.05))
                .forexSelling(BigDecimal.valueOf(selling))
                .rateDate(date)
                .source("TCMB")
                .build();
    }

    private FundPrice fundRow(LocalDate date, double price) {
        return FundPrice.builder()
                .fund(Fund.builder().code("MAC").build())
                .priceDate(date)
                .price(BigDecimal.valueOf(price))
                .build();
    }

    private BondRateHistory bondRow(LocalDate date, double rate) {
        return BondRateHistory.builder()
                .bond(Bond.builder().evdsSeriesCode("TP.DK.USD.A").build())
                .rateDate(date)
                .interestRate(BigDecimal.valueOf(rate))
                .source("TCMB_EVDS")
                .build();
    }

    // ============================================================
    // getHistory
    // ============================================================

    @Nested
    @DisplayName("getHistory")
    class GetHistoryTests {

        @Nested
        @DisplayName("Başarılı sorgular (her instrument tipi)")
        class HappyPath {

            @Test
            @DisplayName("Hisse senedi: stocks tipi doğru repository'ye yönlendirilir")
            void stocksTypeRoutesToStockRepository() {
                List<StockPriceHistory> bars = List.of(
                        stockBar(LocalDate.of(2026, 1, 2), 75.50),
                        stockBar(LocalDate.of(2026, 1, 3), 76.20));
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc("AKBNK.IS", FROM, TO))
                        .thenReturn(bars);

                HistoryResponse response = service.getHistory("stocks", "AKBNK.IS", FROM, TO);

                assertThat(response.getCode()).isEqualTo("AKBNK.IS");
                assertThat(response.getInstrumentType()).isEqualTo("STOCKS");
                assertThat(response.getFrom()).isEqualTo(FROM);
                assertThat(response.getTo()).isEqualTo(TO);
                assertThat(response.getData()).hasSize(2);
                assertThat(response.getData().get(0).getClose()).isEqualByComparingTo("75.50");
                assertThat(response.getData().get(0).getVolume()).isEqualTo(1_000_000L);
                // Diğer repository'ler hiç çağrılmamış olmalı
                verifyNoInteractions(exchangeRateRepository, fundPriceRepository, bondRateHistoryRepository);
            }

            @Test
            @DisplayName("Döviz: fx tipi doğru repository'ye yönlendirilir, sadece close set edilir")
            void fxTypeRoutesToExchangeRateRepository() {
                List<ExchangeRate> rows = List.of(
                        fxRow(LocalDate.of(2026, 1, 2), 32.50),
                        fxRow(LocalDate.of(2026, 1, 3), 32.65));
                when(exchangeRateRepository
                        .findByCurrencyCodeAndRateDateBetweenOrderByRateDateAsc("USD", FROM, TO))
                        .thenReturn(rows);

                HistoryResponse response = service.getHistory("fx", "USD", FROM, TO);

                assertThat(response.getInstrumentType()).isEqualTo("FX");
                assertThat(response.getData()).hasSize(2);
                assertThat(response.getData().get(0).getClose()).isEqualByComparingTo("32.50");
                // FX'te open/high/low/volume yok (HistoryMapper.fromFx sadece close set ediyor)
                assertThat(response.getData().get(0).getOpen()).isNull();
                assertThat(response.getData().get(0).getVolume()).isNull();
            }

            @Test
            @DisplayName("Fon: funds tipi doğru repository'ye yönlendirilir")
            void fundsTypeRoutesToFundPriceRepository() {
                List<FundPrice> rows = List.of(fundRow(LocalDate.of(2026, 1, 2), 12.345));
                when(fundPriceRepository
                        .findByFund_CodeAndPriceDateBetweenOrderByPriceDateAsc("MAC", FROM, TO))
                        .thenReturn(rows);

                HistoryResponse response = service.getHistory("funds", "MAC", FROM, TO);

                assertThat(response.getInstrumentType()).isEqualTo("FUNDS");
                assertThat(response.getData()).hasSize(1);
                assertThat(response.getData().get(0).getClose()).isEqualByComparingTo("12.345");
            }

            @Test
            @DisplayName("Tahvil: bonds tipi doğru repository'ye yönlendirilir")
            void bondsTypeRoutesToBondRateHistoryRepository() {
                List<BondRateHistory> rows = List.of(bondRow(LocalDate.of(2026, 1, 2), 42.85));
                when(bondRateHistoryRepository
                        .findByBond_EvdsSeriesCodeAndRateDateBetweenOrderByRateDateAsc(
                                "TP.DK.USD.A", FROM, TO))
                        .thenReturn(rows);

                HistoryResponse response = service.getHistory("bonds", "TP.DK.USD.A", FROM, TO);

                assertThat(response.getInstrumentType()).isEqualTo("BONDS");
                assertThat(response.getData()).hasSize(1);
                assertThat(response.getData().get(0).getClose()).isEqualByComparingTo("42.85");
            }

            @Test
            @DisplayName("Type case-insensitive — büyük harf girdi de aynı sonucu üretir")
            void typeIsCaseInsensitive() {
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("AKBNK.IS"), any(), any()))
                        .thenReturn(List.of(stockBar(LocalDate.of(2026, 1, 2), 75.50)));

                HistoryResponse response = service.getHistory("STOCKS", "AKBNK.IS", FROM, TO);

                assertThat(response.getInstrumentType()).isEqualTo("STOCKS");
                assertThat(response.getData()).hasSize(1);
            }
        }

        @Nested
        @DisplayName("Tarih aralığı validasyonu (FR-15)")
        class DateValidation {

            @Test
            @DisplayName("from > to ise BadRequestException fırlar (FR-15)")
            void startAfterEndThrowsBadRequest() {
                LocalDate from = LocalDate.of(2026, 4, 1);
                LocalDate to   = LocalDate.of(2026, 1, 1);

                assertThatThrownBy(() ->
                        service.getHistory("stocks", "AKBNK.IS", from, to))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Parametre: from");

                // Repository hiç çağrılmamış olmalı
                verifyNoInteractions(stockHistoryRepository);
            }

            @Test
            @DisplayName("365 günden uzun aralık BadRequestException fırlar")
            void rangeOver365DaysThrowsBadRequest() {
                LocalDate from = LocalDate.of(2025, 1, 1);
                LocalDate to   = LocalDate.of(2026, 1, 5); // 369 gün

                assertThatThrownBy(() ->
                        service.getHistory("stocks", "AKBNK.IS", from, to))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Parametre: range");
            }

            @Test
            @DisplayName("Tam 365 gün aralık geçerlidir (sınır kontrolü)")
            void exactly365DaysIsValid() {
                LocalDate from = LocalDate.of(2025, 1, 1);
                LocalDate to   = LocalDate.of(2026, 1, 1); // tam 365 gün
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("AKBNK.IS"), eq(from), eq(to)))
                        .thenReturn(Collections.emptyList());

                // Exception fırlatılmamalı
                HistoryResponse response = service.getHistory("stocks", "AKBNK.IS", from, to);

                assertThat(response).isNotNull();
            }

            @Test
            @DisplayName("from = to (aynı gün) geçerlidir")
            void sameDayIsValid() {
                LocalDate sameDay = LocalDate.of(2026, 4, 24);
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("AKBNK.IS"), eq(sameDay), eq(sameDay)))
                        .thenReturn(Collections.emptyList());

                HistoryResponse response = service.getHistory("stocks", "AKBNK.IS", sameDay, sameDay);

                assertThat(response.getFrom()).isEqualTo(sameDay);
                assertThat(response.getTo()).isEqualTo(sameDay);
            }
        }

        @Nested
        @DisplayName("Veri yokluğu (FR-16)")
        class EmptyDataScenarios {

            @Test
            @DisplayName("Veritabanında veri yoksa boş data ile response döner (NotFound atılmaz, FR-16)")
            void emptyRepositoryReturnsEmptyDataNotException() {
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("UNKNOWN"), any(), any()))
                        .thenReturn(Collections.emptyList());

                HistoryResponse response = service.getHistory("stocks", "UNKNOWN", FROM, TO);

                assertThat(response).isNotNull();
                assertThat(response.getCode()).isEqualTo("UNKNOWN");
                assertThat(response.getData()).isEmpty();
            }
        }

        @Nested
        @DisplayName("Geçersiz instrument tipi")
        class InvalidType {

            @Test
            @DisplayName("Bilinmeyen type için BadRequestException fırlar")
            void unknownTypeThrowsBadRequest() {
                assertThatThrownBy(() ->
                        service.getHistory("crypto", "BTC", FROM, TO))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Parametre: type");
            }

            @Test
            @DisplayName("Boş string type için BadRequestException fırlar")
            void emptyStringTypeThrowsBadRequest() {
                assertThatThrownBy(() ->
                        service.getHistory("", "X", FROM, TO))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Parametre: type");
            }
        }
    }

    // ============================================================
    // getCompare
    // ============================================================

    @Nested
    @DisplayName("getCompare")
    class GetCompareTests {

        @Nested
        @DisplayName("Başarılı sorgular")
        class HappyPath {

            @Test
            @DisplayName("Tek enstrüman karşılaştırma haritada bir entry üretir")
            void singleCodeProducesSingleSeriesEntry() {
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("AKBNK.IS"), any(), any()))
                        .thenReturn(List.of(stockBar(LocalDate.of(2026, 1, 2), 75.50)));

                CompareResponse response = service.getCompare(
                        "stocks", List.of("AKBNK.IS"), FROM, TO);

                assertThat(response.getInstrumentType()).isEqualTo("STOCKS");
                assertThat(response.getSeries()).hasSize(1);
                assertThat(response.getSeries()).containsKey("AKBNK.IS");
                assertThat(response.getSeries().get("AKBNK.IS")).hasSize(1);
            }

            @Test
            @DisplayName("Üç enstrüman karşılaştırma haritada üç entry, sırası korunur")
            void threeCodesProducesThreeOrderedEntries() {
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("AKBNK.IS"), any(), any()))
                        .thenReturn(List.of(stockBar(LocalDate.of(2026, 1, 2), 75.50)));
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("THYAO.IS"), any(), any()))
                        .thenReturn(List.of(stockBar(LocalDate.of(2026, 1, 2), 240.00)));
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("GARAN.IS"), any(), any()))
                        .thenReturn(List.of(stockBar(LocalDate.of(2026, 1, 2), 82.30)));

                CompareResponse response = service.getCompare(
                        "stocks", List.of("AKBNK.IS", "THYAO.IS", "GARAN.IS"), FROM, TO);

                assertThat(response.getSeries()).hasSize(3);
                // LinkedHashMap kullanıldığı için sıralama korunur
                assertThat(response.getSeries().keySet())
                        .containsExactly("AKBNK.IS", "THYAO.IS", "GARAN.IS");
            }

            @Test
            @DisplayName("Bir enstrümanın verisi boş olsa diğerleri etkilenmez")
            void emptyDataForOneCodeDoesNotAffectOthers() {
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("AKBNK.IS"), any(), any()))
                        .thenReturn(List.of(stockBar(LocalDate.of(2026, 1, 2), 75.50)));
                when(stockHistoryRepository
                        .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                                eq("UNKNOWN"), any(), any()))
                        .thenReturn(Collections.emptyList());

                CompareResponse response = service.getCompare(
                        "stocks", List.of("AKBNK.IS", "UNKNOWN"), FROM, TO);

                assertThat(response.getSeries().get("AKBNK.IS")).hasSize(1);
                assertThat(response.getSeries().get("UNKNOWN")).isEmpty();
            }
        }

        @Nested
        @DisplayName("Codes validasyonu (FR-17)")
        class CodesValidation {

            @Test
            @DisplayName("4 ve daha fazla code için BadRequestException fırlar (FR-17, max 3)")
            void moreThanThreeCodesThrowsBadRequest() {
                List<String> tooMany = List.of("A", "B", "C", "D");

                assertThatThrownBy(() ->
                        service.getCompare("stocks", tooMany, FROM, TO))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Parametre: codes");

                // Validasyon repository çağrısından önce, hiç repo'ya gitmemiş olmalı
                verifyNoInteractions(stockHistoryRepository);
            }

            @Test
            @DisplayName("Boş codes listesi için BadRequestException fırlar")
            void emptyCodesThrowsBadRequest() {
                assertThatThrownBy(() ->
                        service.getCompare("stocks", Collections.emptyList(), FROM, TO))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Alan: codes");
            }

            @Test
            @DisplayName("Null codes için BadRequestException fırlar")
            void nullCodesThrowsBadRequest() {
                assertThatThrownBy(() ->
                        service.getCompare("stocks", null, FROM, TO))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Alan: codes");
            }
        }

        @Nested
        @DisplayName("Tarih validasyonu compare için de geçerli")
        class DateValidation {

            @Test
            @DisplayName("from > to compare için de BadRequestException fırlar")
            void startAfterEndThrowsBadRequestInCompare() {
                LocalDate from = LocalDate.of(2026, 4, 1);
                LocalDate to   = LocalDate.of(2026, 1, 1);

                assertThatThrownBy(() ->
                        service.getCompare("stocks", List.of("AKBNK.IS"), from, to))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Parametre: from");

                verifyNoInteractions(stockHistoryRepository);
            }

            @Test
            @DisplayName("Validasyon sırası: önce tarih, sonra codes")
            void dateValidationRunsBeforeCodesValidation() {
                LocalDate from = LocalDate.of(2026, 4, 1);
                LocalDate to   = LocalDate.of(2026, 1, 1);
                List<String> tooMany = List.of("A", "B", "C", "D");

                // Hem tarih bozuk hem codes fazla — tarih hatası önce çıkmalı
                assertThatThrownBy(() ->
                        service.getCompare("stocks", tooMany, from, to))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("Parametre: from");
                // 'codes' değil 'from' mesajı dönmeli
            }
        }
    }
}
