package com.alper.backend.market.stocks.service;

import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.market.stocks.dto.StockIndicatorResponse;
import com.alper.backend.market.stocks.mapper.StockIndicatorMapper;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockTechnicalIndicator;
import com.alper.backend.market.stocks.repository.StockTechnicalIndicatorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StockIndicatorQueryService")
class StockIndicatorQueryServiceTest {

    @Mock private StockTechnicalIndicatorRepository repository;

    // Mapper'ı GERÇEK kullanıyoruz — basit bir entity→DTO dönüşümü
    private StockIndicatorMapper mapper;

    private StockIndicatorQueryService service;

    @BeforeEach
    void setUp() {
        mapper = new StockIndicatorMapper();
        service = new StockIndicatorQueryService(repository, mapper);
    }

    // ----- Helpers -----

    private Stock stock(String symbol) {
        return Stock.builder()
                .id(1L)
                .symbol(symbol)
                .shortName(symbol.replace(".IS", ""))
                .build();
    }

    private StockTechnicalIndicator indicator(Stock s, LocalDate date) {
        return StockTechnicalIndicator.builder()
                .stock(s)
                .tradeDate(date)
                .rsi14(new BigDecimal("59.3000"))
                .macdLine(new BigDecimal("1.330000"))
                .macdSignal(new BigDecimal("1.250000"))
                .macdHistogram(new BigDecimal("0.080000"))
                .sma20(new BigDecimal("76.5000"))
                .sma50(new BigDecimal("72.1000"))
                .sma200(new BigDecimal("65.4000"))
                .ema12(new BigDecimal("77.0000"))
                .ema26(new BigDecimal("75.3000"))
                .bollingerUpper(new BigDecimal("82.1000"))
                .bollingerMiddle(new BigDecimal("76.5000"))
                .bollingerLower(new BigDecimal("70.9000"))
                .stochasticK(new BigDecimal("83.0000"))
                .stochasticD(new BigDecimal("78.5000"))
                .atr14(new BigDecimal("2.4500"))
                .ichimokuTenkan(new BigDecimal("77.2000"))
                .ichimokuKijun(new BigDecimal("74.8000"))
                .ichimokuSenkouA(new BigDecimal("76.0000"))
                .ichimokuSenkouB(new BigDecimal("73.5000"))
                .build();
    }

    // ============================================================
    // getLatest
    // ============================================================

    @Nested
    @DisplayName("getLatest")
    class GetLatestTests {

        @Test
        @DisplayName("Bulunan indikatör DTO'ya dönüştürülür, tüm alanlar taşınır")
        void existingIndicatorMapsToFullDto() {
            Stock akbnk = stock("AKBNK.IS");
            StockTechnicalIndicator entity = indicator(akbnk, LocalDate.of(2026, 4, 24));
            when(repository.findTopByStock_SymbolOrderByTradeDateDesc("AKBNK.IS"))
                    .thenReturn(Optional.of(entity));

            StockIndicatorResponse response = service.getLatest("AKBNK.IS");

            assertThat(response.getSymbol()).isEqualTo("AKBNK.IS");
            assertThat(response.getTradeDate()).isEqualTo(LocalDate.of(2026, 4, 24));
            assertThat(response.getRsi14()).isEqualByComparingTo("59.3000");
            assertThat(response.getMacdLine()).isEqualByComparingTo("1.330000");
            assertThat(response.getStochasticK()).isEqualByComparingTo("83.0000");
            assertThat(response.getBollingerUpper()).isEqualByComparingTo("82.1000");
            assertThat(response.getAtr14()).isEqualByComparingTo("2.4500");
            assertThat(response.getIchimokuTenkan()).isEqualByComparingTo("77.2000");
            assertThat(response.getSma200()).isEqualByComparingTo("65.4000");
        }

        @Test
        @DisplayName("Symbol case-insensitive — küçük harf girdi büyük harfe çevrilerek sorulur")
        void symbolIsConvertedToUpperCase() {
            Stock akbnk = stock("AKBNK.IS");
            when(repository.findTopByStock_SymbolOrderByTradeDateDesc("AKBNK.IS"))
                    .thenReturn(Optional.of(indicator(akbnk, LocalDate.of(2026, 4, 24))));

            StockIndicatorResponse response = service.getLatest("akbnk.is");

            assertThat(response).isNotNull();
            // Repository'ye büyük harf'le sorulduğu doğrulandı (mock'a "AKBNK.IS" eşleştirdik)
            verify(repository).findTopByStock_SymbolOrderByTradeDateDesc("AKBNK.IS");
        }

        @Test
        @DisplayName("Bulunamayan symbol için NotFoundException fırlar (2001_FP_NOT_FOUND)")
        void missingSymbolThrowsNotFound() {
            when(repository.findTopByStock_SymbolOrderByTradeDateDesc("UNKNOWN"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getLatest("UNKNOWN"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("Indikatör verisi bulunamadı")
                    .hasMessageContaining("UNKNOWN");
        }

        @Test
        @DisplayName("Indikatör alanları null olsa da response üretilir (warm-up döneminde)")
        void nullIndicatorFieldsDoNotCauseFailure() {
            Stock akbnk = stock("AKBNK.IS");
            // Warm-up dönemindeki kayıtta SMA200 null olabilir
            StockTechnicalIndicator partialEntity = StockTechnicalIndicator.builder()
                    .stock(akbnk)
                    .tradeDate(LocalDate.of(2026, 4, 24))
                    .rsi14(new BigDecimal("59.30"))
                    // Diğer alanlar null
                    .build();
            when(repository.findTopByStock_SymbolOrderByTradeDateDesc("AKBNK.IS"))
                    .thenReturn(Optional.of(partialEntity));

            StockIndicatorResponse response = service.getLatest("AKBNK.IS");

            assertThat(response.getSymbol()).isEqualTo("AKBNK.IS");
            assertThat(response.getRsi14()).isEqualByComparingTo("59.30");
            assertThat(response.getSma200()).isNull();
            assertThat(response.getMacdLine()).isNull();
            assertThat(response.getBollingerUpper()).isNull();
        }
    }

    // ============================================================
    // getHistory
    // ============================================================

    @Nested
    @DisplayName("getHistory")
    class GetHistoryTests {

        @Test
        @DisplayName("Tarih aralığında bulunan kayıtlar DTO listesine dönüştürülür")
        void rangeWithDataReturnsListOfDtos() {
            Stock akbnk = stock("AKBNK.IS");
            LocalDate from = LocalDate.of(2026, 4, 1);
            LocalDate to   = LocalDate.of(2026, 4, 24);

            when(repository.findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                    "AKBNK.IS", from, to))
                    .thenReturn(List.of(
                            indicator(akbnk, LocalDate.of(2026, 4, 22)),
                            indicator(akbnk, LocalDate.of(2026, 4, 23)),
                            indicator(akbnk, LocalDate.of(2026, 4, 24))));

            List<StockIndicatorResponse> result = service.getHistory("AKBNK.IS", from, to);

            assertThat(result).hasSize(3);
            assertThat(result).extracting(StockIndicatorResponse::getTradeDate)
                    .containsExactly(
                            LocalDate.of(2026, 4, 22),
                            LocalDate.of(2026, 4, 23),
                            LocalDate.of(2026, 4, 24));
            assertThat(result.get(0).getSymbol()).isEqualTo("AKBNK.IS");
        }

        @Test
        @DisplayName("Boş tarih aralığı için boş liste döner (NotFound atılmaz)")
        void emptyRangeReturnsEmptyList() {
            LocalDate from = LocalDate.of(2026, 4, 1);
            LocalDate to   = LocalDate.of(2026, 4, 24);

            when(repository.findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                    eq("UNKNOWN"), eq(from), eq(to)))
                    .thenReturn(Collections.emptyList());

            List<StockIndicatorResponse> result = service.getHistory("UNKNOWN", from, to);

            assertThat(result).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("Symbol case-insensitive — küçük harf girdi büyük harfe çevrilerek sorulur")
        void symbolIsConvertedToUpperCase() {
            Stock akbnk = stock("AKBNK.IS");
            LocalDate from = LocalDate.of(2026, 4, 1);
            LocalDate to   = LocalDate.of(2026, 4, 24);

            when(repository.findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                    eq("AKBNK.IS"), any(), any()))
                    .thenReturn(List.of(indicator(akbnk, LocalDate.of(2026, 4, 24))));

            List<StockIndicatorResponse> result = service.getHistory("akbnk.is", from, to);

            assertThat(result).hasSize(1);
            verify(repository).findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                    "AKBNK.IS", from, to);
        }

        @Test
        @DisplayName("from > to ise IllegalArgumentException fırlar (DİKKAT: tutarsızlık)")
        void startAfterEndThrowsIllegalArgument() {
            // POTENSİYEL TUTARSIZLIK:
            // HistoryQueryService aynı durumda BadRequestException atıyor.
            // StockIndicatorQueryService ise IllegalArgumentException atıyor.
            // Bu test mevcut davranışı çiviler. Refactor'da bu hizalanmalı —
            // doküman'ın 1003_FP_INVALID_PARAMETER hata kodu konvansiyonu için
            // BadRequestException standart olmalı.
            LocalDate from = LocalDate.of(2026, 4, 24);
            LocalDate to   = LocalDate.of(2026, 4, 1);

            assertThatThrownBy(() -> service.getHistory("AKBNK.IS", from, to))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("'from' tarihi 'to'dan sonra olamaz");

            verifyNoInteractions(repository);
        }

        @Test
        @DisplayName("from = to (aynı gün) geçerli — tarih validation geçer")
        void sameDayIsValid() {
            LocalDate sameDay = LocalDate.of(2026, 4, 24);

            when(repository.findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                    eq("AKBNK.IS"), eq(sameDay), eq(sameDay)))
                    .thenReturn(Collections.emptyList());

            List<StockIndicatorResponse> result = service.getHistory("AKBNK.IS", sameDay, sameDay);

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Çok uzun aralık (365+ gün) burada engellenmez (HistoryQueryService'in aksine)")
        void longRangeIsNotBlocked() {
            // POTENSİYEL TUTARSIZLIK:
            // HistoryQueryService'te 365 gün üst sınır var, burada yok.
            // Bu davranış farkı bilinçli mi tesadüf mü belli değil; test'le
            // mevcut durumu çiviliyoruz. Refactor'da iki service hizalanabilir.
            LocalDate from = LocalDate.of(2024, 1, 1);
            LocalDate to   = LocalDate.of(2026, 4, 24);  // 800+ gün

            when(repository.findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                    eq("AKBNK.IS"), eq(from), eq(to)))
                    .thenReturn(Collections.emptyList());

            // Exception fırlatılmamalı
            List<StockIndicatorResponse> result = service.getHistory("AKBNK.IS", from, to);

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Repository'nin döndürdüğü sıra response listesinde korunur")
        void repositoryOrderIsPreserved() {
            Stock akbnk = stock("AKBNK.IS");
            LocalDate from = LocalDate.of(2026, 4, 1);
            LocalDate to   = LocalDate.of(2026, 4, 24);

            // Repo zaten Asc sıralı döner; biz de bunu doğruluyoruz
            when(repository.findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                    eq("AKBNK.IS"), any(), any()))
                    .thenReturn(List.of(
                            indicator(akbnk, LocalDate.of(2026, 4, 5)),
                            indicator(akbnk, LocalDate.of(2026, 4, 10)),
                            indicator(akbnk, LocalDate.of(2026, 4, 20))));

            List<StockIndicatorResponse> result = service.getHistory("AKBNK.IS", from, to);

            assertThat(result).extracting(StockIndicatorResponse::getTradeDate)
                    .containsExactly(
                            LocalDate.of(2026, 4, 5),
                            LocalDate.of(2026, 4, 10),
                            LocalDate.of(2026, 4, 20));
        }
    }
}
