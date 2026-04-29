package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.model.StockPriceHistory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TechnicalIndicatorCalculator")
class TechnicalIndicatorCalculatorTest {

    private TechnicalIndicatorCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new TechnicalIndicatorCalculator();
    }

    private List<StockPriceHistory> generateHistory(int days, java.util.function.IntFunction<Double> priceFn) {
        LocalDate start = LocalDate.of(2025, 1, 1);
        List<StockPriceHistory> list = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            BigDecimal price = BigDecimal.valueOf(priceFn.apply(i));
            list.add(StockPriceHistory.builder()
                    .tradeDate(start.plusDays(i))
                    .openPrice(price)
                    .highPrice(price)
                    .lowPrice(price)
                    .closePrice(price)
                    .volume(1_000_000L)
                    .build());
        }
        return list;
    }

    private List<StockPriceHistory> constantPriceHistory(int days, double price) {
        return generateHistory(days, i -> price);
    }

    private List<StockPriceHistory> ascendingPriceHistory(int days, double startPrice, double step) {
        return generateHistory(days, i -> startPrice + step * i);
    }

    @Nested
    @DisplayName("Boş ve null girdi")
    class EmptyInputTests {

        @Test
        @DisplayName("null girdi için boş map döner")
        void nullInputReturnsEmptyMap() {
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(null);
            assertThat(result).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("Boş liste için boş map döner")
        void emptyListReturnsEmptyMap() {
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(Collections.emptyList());
            assertThat(result).isNotNull().isEmpty();
        }
    }

    @Nested
    @DisplayName("Output yapısı")
    class OutputStructureTests {

        @Test
        @DisplayName("Her giriş tarihi için bir snapshot üretilir")
        void everyInputDateGetsSnapshot() {
            List<StockPriceHistory> history = constantPriceHistory(30, 100.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            assertThat(result).hasSize(30);
            for (StockPriceHistory h : history) {
                assertThat(result).containsKey(h.getTradeDate());
                assertThat(result.get(h.getTradeDate()).getTradeDate()).isEqualTo(h.getTradeDate());
            }
        }

        @Test
        @DisplayName("closePrice null olan barlar map'e eklenmez veya boş eklenir, crash etmez")
        void barsWithNullClosePriceDoNotCrash() {
            List<StockPriceHistory> history = new ArrayList<>(constantPriceHistory(20, 100.0));
            StockPriceHistory tampered = StockPriceHistory.builder()
                    .tradeDate(history.get(10).getTradeDate())
                    .openPrice(BigDecimal.valueOf(100))
                    .highPrice(BigDecimal.valueOf(100))
                    .lowPrice(BigDecimal.valueOf(100))
                    .closePrice(null)
                    .volume(1_000_000L)
                    .build();
            history.set(10, tampered);

            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);
            assertThat(result).isNotNull();
            assertThat(result.size()).isLessThanOrEqualTo(20);
        }
    }

    @Nested
    @DisplayName("Sıralama defansı")
    class SortingDefenseTests {

        @Test
        @DisplayName("Ters sıralı girdi de aynı sonucu verir (defansif sort)")
        void reverseOrderedInputProducesSameResult() {
            List<StockPriceHistory> ascending = ascendingPriceHistory(50, 100.0, 1.0);
            List<StockPriceHistory> reversed = new ArrayList<>(ascending);
            Collections.reverse(reversed);

            Map<LocalDate, IndicatorSnapshot> resultAsc = calculator.calculate(ascending);
            Map<LocalDate, IndicatorSnapshot> resultRev = calculator.calculate(reversed);

            for (StockPriceHistory h : ascending) {
                IndicatorSnapshot fromAsc = resultAsc.get(h.getTradeDate());
                IndicatorSnapshot fromRev = resultRev.get(h.getTradeDate());
                assertThat(fromAsc).isNotNull();
                assertThat(fromRev).isNotNull();
                assertThat(fromAsc.getSma20()).isEqualTo(fromRev.getSma20());
            }
        }
    }

    @Nested
    @DisplayName("Warm-up periyot davranışı")
    class WarmUpTests {

        @Test
        @DisplayName("RSI 14: ilk 13 gün null, 14. günden itibaren dolu")
        void rsiNullBeforeWarmUpThenFilled() {
            List<StockPriceHistory> history = ascendingPriceHistory(30, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            for (int i = 0; i < 13; i++) {
                IndicatorSnapshot s = result.get(history.get(i).getTradeDate());
                assertThat(s.getRsi14())
                        .as("RSI day %d (index %d) should be null", i + 1, i)
                        .isNull();
            }
            IndicatorSnapshot day14 = result.get(history.get(13).getTradeDate());
            assertThat(day14.getRsi14())
                    .as("RSI day 14 should be filled")
                    .isNotNull();
        }

        @Test
        @DisplayName("SMA 20: ilk 19 gün null, 20. günden itibaren dolu")
        void sma20NullBeforeWarmUpThenFilled() {
            List<StockPriceHistory> history = ascendingPriceHistory(40, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            for (int i = 0; i < 19; i++) {
                assertThat(result.get(history.get(i).getTradeDate()).getSma20())
                        .as("SMA20 index %d should be null", i)
                        .isNull();
            }
            assertThat(result.get(history.get(19).getTradeDate()).getSma20())
                    .as("SMA20 index 19 (20th day) should be filled")
                    .isNotNull();
        }

        @Test
        @DisplayName("SMA 200: 199 günlük girdide tamamen null kalır")
        void sma200NullForInsufficientData() {
            List<StockPriceHistory> history = ascendingPriceHistory(199, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            for (StockPriceHistory h : history) {
                assertThat(result.get(h.getTradeDate()).getSma200())
                        .as("SMA200 should be null for index < 200")
                        .isNull();
            }
        }

        @Test
        @DisplayName("SMA 200: 200 günlük girdide son gün dolu")
        void sma200FilledOnDay200() {
            List<StockPriceHistory> history = ascendingPriceHistory(200, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            assertThat(result.get(history.get(199).getTradeDate()).getSma200())
                    .as("SMA200 on day 200 should be filled")
                    .isNotNull();
        }
    }

    @Nested
    @DisplayName("Anlamlı değer kontrolleri")
    class MeaningfulValueTests {

        @Test
        @DisplayName("Sabit fiyat serisinde SMA = sabit fiyat")
        void constantPriceMakesSmaEqualToPrice() {
            List<StockPriceHistory> history = constantPriceHistory(30, 100.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            BigDecimal sma20Day20 = result.get(history.get(19).getTradeDate()).getSma20();
            assertThat(sma20Day20).isNotNull();
            assertThat(sma20Day20).isEqualByComparingTo(BigDecimal.valueOf(100));
        }

        @Test
        @DisplayName("Sabit fiyat serisinde crash olmadan sonuç döner")
        void constantPriceDoesNotCrash() {
            List<StockPriceHistory> history = constantPriceHistory(30, 100.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);
            assertThat(result).hasSize(30);
        }

        @Test
        @DisplayName("Sürekli yükselen fiyatta SMA20 > SMA50 (kısa MA daha hızlı tepki verir)")
        void inUptrendShortSmaIsAboveLongSma() {
            List<StockPriceHistory> history = ascendingPriceHistory(60, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            IndicatorSnapshot last = result.get(history.get(59).getTradeDate());
            assertThat(last.getSma20()).isNotNull();
            assertThat(last.getSma50()).isNotNull();
            assertThat(last.getSma20()).isGreaterThan(last.getSma50());
        }

        @Test
        @DisplayName("Bollinger band'leri sabit fiyatta sıfır genişlikte (upper=middle=lower)")
        void bollingerBandsCollapseOnConstantPrice() {
            List<StockPriceHistory> history = constantPriceHistory(30, 100.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            IndicatorSnapshot day20 = result.get(history.get(19).getTradeDate());
            assertThat(day20.getBollingerUpper()).isNotNull();
            assertThat(day20.getBollingerMiddle()).isNotNull();
            assertThat(day20.getBollingerLower()).isNotNull();

            assertThat(day20.getBollingerUpper()).isEqualByComparingTo(day20.getBollingerMiddle());
            assertThat(day20.getBollingerLower()).isEqualByComparingTo(day20.getBollingerMiddle());
        }
    }

    @Nested
    @DisplayName("Ondalık scale kontrolleri")
    class ScaleTests {

        @Test
        @DisplayName("RSI 4 ondalık hane ile döner")
        void rsiHasFourDecimalScale() {
            List<StockPriceHistory> history = ascendingPriceHistory(30, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            BigDecimal rsi = result.get(history.get(29).getTradeDate()).getRsi14();
            assertThat(rsi).isNotNull();
            assertThat(rsi.scale()).isEqualTo(4);
        }

        @Test
        @DisplayName("MACD line 6 ondalık hane ile döner")
        void macdLineHasSixDecimalScale() {
            List<StockPriceHistory> history = ascendingPriceHistory(40, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            BigDecimal macdLine = result.get(history.get(39).getTradeDate()).getMacdLine();
            assertThat(macdLine).isNotNull();
            assertThat(macdLine.scale()).isEqualTo(6);
        }

        @Test
        @DisplayName("SMA20 4 ondalık hane ile döner")
        void sma20HasFourDecimalScale() {
            List<StockPriceHistory> history = ascendingPriceHistory(30, 100.0, 1.0);
            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);

            BigDecimal sma20 = result.get(history.get(29).getTradeDate()).getSma20();
            assertThat(sma20).isNotNull();
            assertThat(sma20.scale()).isEqualTo(4);
        }
    }

    @Nested
    @DisplayName("OHLC null fallback davranışı")
    class OhlcFallbackTests {

        @Test
        @DisplayName("open/high/low null olsa da close varsa hesaplama yapılır")
        void onlyClosePriceIsSufficient() {
            List<StockPriceHistory> history = new ArrayList<>();
            LocalDate start = LocalDate.of(2025, 1, 1);
            for (int i = 0; i < 30; i++) {
                history.add(StockPriceHistory.builder()
                        .tradeDate(start.plusDays(i))
                        .openPrice(null)
                        .highPrice(null)
                        .lowPrice(null)
                        .closePrice(BigDecimal.valueOf(100 + i))
                        .volume(1_000_000L)
                        .build());
            }

            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);
            assertThat(result).hasSize(30);
            assertThat(result.get(history.get(29).getTradeDate()).getSma20()).isNotNull();
        }

        @Test
        @DisplayName("volume null olsa da hesaplama yapılır")
        void nullVolumeDoesNotCauseFailure() {
            List<StockPriceHistory> history = new ArrayList<>();
            LocalDate start = LocalDate.of(2025, 1, 1);
            for (int i = 0; i < 30; i++) {
                history.add(StockPriceHistory.builder()
                        .tradeDate(start.plusDays(i))
                        .openPrice(BigDecimal.valueOf(100 + i))
                        .highPrice(BigDecimal.valueOf(100 + i))
                        .lowPrice(BigDecimal.valueOf(100 + i))
                        .closePrice(BigDecimal.valueOf(100 + i))
                        .volume(null)
                        .build());
            }

            Map<LocalDate, IndicatorSnapshot> result = calculator.calculate(history);
            assertThat(result).hasSize(30);
        }
    }
}
