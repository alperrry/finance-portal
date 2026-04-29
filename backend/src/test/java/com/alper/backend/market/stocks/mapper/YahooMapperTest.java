package com.alper.backend.market.stocks.mapper;

import com.alper.backend.market.stocks.dto.YahooQuoteResult;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("YahooMapper")
class YahooMapperTest {

    private YahooMapper mapper;
    private Stock testStock;

    @BeforeEach
    void setUp() {
        mapper = new YahooMapper();
        testStock = Stock.builder()
                .id(1L)
                .symbol("AKBNK.IS")
                .shortName("AKBNK")
                .longName("Akbank T.A.S.")
                .build();
    }

    // Helper: tüm alanları dolu bir Yahoo quote result
    private YahooQuoteResult fullQuote() {
        return YahooQuoteResult.builder()
                .symbol("AKBNK.IS")
                .regularMarketPrice(77.90)
                .regularMarketChange(0.45)
                .regularMarketChangePercent(0.58)
                .regularMarketOpen(78.70)
                .regularMarketDayHigh(79.15)
                .regularMarketDayLow(77.60)
                .regularMarketPreviousClose(77.45)
                .regularMarketVolume(92_700_000L)
                .marketCap(450_000_000_000L)
                .fiftyTwoWeekHigh(85.20)
                .fiftyTwoWeekLow(45.10)
                .build();
    }

    // ============================================================
    // toSnapshotEntity
    // ============================================================

    @Nested
    @DisplayName("toSnapshotEntity")
    class ToSnapshotEntityTests {

        @Nested
        @DisplayName("Başarılı dönüşüm")
        class HappyPath {

            @Test
            @DisplayName("Tüm alanları dolu DTO başarıyla snapshot'a dönüşür")
            void fullDtoMapsToSnapshot() {
                YahooQuoteResult dto = fullQuote();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot).isNotNull();
                assertThat(snapshot.getStock()).isSameAs(testStock);
                assertThat(snapshot.getPrice()).isEqualByComparingTo("77.90");
                assertThat(snapshot.getChange()).isEqualByComparingTo("0.45");
                assertThat(snapshot.getChangePercent()).isEqualByComparingTo("0.58");
                assertThat(snapshot.getOpen()).isEqualByComparingTo("78.70");
                assertThat(snapshot.getDayHigh()).isEqualByComparingTo("79.15");
                assertThat(snapshot.getDayLow()).isEqualByComparingTo("77.60");
                assertThat(snapshot.getPreviousClose()).isEqualByComparingTo("77.45");
                assertThat(snapshot.getVolume()).isEqualTo(92_700_000L);
                assertThat(snapshot.getMarketCap()).isEqualTo(450_000_000_000L);
                assertThat(snapshot.getFiftyTwoWeekHigh()).isEqualByComparingTo("85.20");
                assertThat(snapshot.getFiftyTwoWeekLow()).isEqualByComparingTo("45.10");
            }

            @Test
            @DisplayName("Negatif change değeri (düşüş) doğru taşınır")
            void negativeChangeIsPreserved() {
                YahooQuoteResult dto = YahooQuoteResult.builder()
                        .regularMarketPrice(52.30)
                        .regularMarketChange(-0.45)
                        .regularMarketChangePercent(-0.85)
                        .build();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot.getChange()).isEqualByComparingTo("-0.45");
                assertThat(snapshot.getChangePercent()).isEqualByComparingTo("-0.85");
            }

            @Test
            @DisplayName("Stock referansı snapshot'a aynen geçer")
            void stockReferenceIsPropagated() {
                YahooQuoteResult dto = fullQuote();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot.getStock()).isSameAs(testStock);
                assertThat(snapshot.getStock().getSymbol()).isEqualTo("AKBNK.IS");
            }

            @Test
            @DisplayName("Sıfır volume ve marketCap geçerli değerler olarak kabul edilir")
            void zeroVolumeAndMarketCapAreAccepted() {
                YahooQuoteResult dto = YahooQuoteResult.builder()
                        .regularMarketPrice(100.0)
                        .regularMarketVolume(0L)
                        .marketCap(0L)
                        .build();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot.getVolume()).isEqualTo(0L);
                assertThat(snapshot.getMarketCap()).isEqualTo(0L);
            }
        }

        @Nested
        @DisplayName("Null alan davranışı")
        class NullFieldBehavior {

            @Test
            @DisplayName("Tüm sayısal alanlar null olsa bile crash olmadan snapshot üretilir")
            void allNullDoubleFieldsProduceNullBigDecimals() {
                // Boş builder — hiçbir alan set edilmemiş, hepsi null
                YahooQuoteResult dto = YahooQuoteResult.builder().build();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot).isNotNull();
                assertThat(snapshot.getPrice()).isNull();
                assertThat(snapshot.getChange()).isNull();
                assertThat(snapshot.getChangePercent()).isNull();
                assertThat(snapshot.getOpen()).isNull();
                assertThat(snapshot.getDayHigh()).isNull();
                assertThat(snapshot.getDayLow()).isNull();
                assertThat(snapshot.getPreviousClose()).isNull();
                assertThat(snapshot.getVolume()).isNull();
                assertThat(snapshot.getMarketCap()).isNull();
                assertThat(snapshot.getFiftyTwoWeekHigh()).isNull();
                assertThat(snapshot.getFiftyTwoWeekLow()).isNull();
                // Stock referansı yine de set edilmiş olmalı
                assertThat(snapshot.getStock()).isSameAs(testStock);
            }

            @Test
            @DisplayName("Sadece price dolu, gerisi null olan DTO için price taşınır, gerisi null kalır")
            void onlyPriceFilledOthersNull() {
                YahooQuoteResult dto = YahooQuoteResult.builder()
                        .regularMarketPrice(50.25)
                        .build();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot.getPrice()).isEqualByComparingTo("50.25");
                assertThat(snapshot.getDayHigh()).isNull();
                assertThat(snapshot.getDayLow()).isNull();
                assertThat(snapshot.getVolume()).isNull();
            }

            @Test
            @DisplayName("Volume null olsa bile diğer alanlar dolu kalır")
            void nullVolumeDoesNotAffectOtherFields() {
                YahooQuoteResult dto = YahooQuoteResult.builder()
                        .regularMarketPrice(77.90)
                        .regularMarketDayHigh(79.15)
                        // volume hiç set edilmedi → null
                        .build();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot.getPrice()).isEqualByComparingTo("77.90");
                assertThat(snapshot.getDayHigh()).isEqualByComparingTo("79.15");
                assertThat(snapshot.getVolume()).isNull();
            }
        }

        @Nested
        @DisplayName("Sayısal sınır değerler")
        class NumericEdgeCases {

            @Test
            @DisplayName("Çok küçük ondalık değerler (kuruş seviyesi) doğru aktarılır")
            void smallDecimalValuesArePreserved() {
                YahooQuoteResult dto = YahooQuoteResult.builder()
                        .regularMarketPrice(0.0125)
                        .regularMarketChange(0.0001)
                        .build();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot.getPrice()).isEqualByComparingTo("0.0125");
                assertThat(snapshot.getChange()).isEqualByComparingTo("0.0001");
            }

            @Test
            @DisplayName("Çok büyük market cap (milyar TL üstü) Long olarak doğru aktarılır")
            void largeMarketCapIsPreserved() {
                YahooQuoteResult dto = YahooQuoteResult.builder()
                        .marketCap(2_500_000_000_000L)
                        .build();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                assertThat(snapshot.getMarketCap()).isEqualTo(2_500_000_000_000L);
            }
        }
    }

    // ============================================================
    // toHistoryEntity
    // ============================================================

    @Nested
    @DisplayName("toHistoryEntity")
    class ToHistoryEntityTests {

        // Snapshot'ın tradeDate'i normalde @PrePersist'te set edilir.
        // Mapper testinde manuel olarak builder'a veriyoruz çünkü
        // toHistoryEntity bu alana güveniyor.
        private StockPriceSnapshot fullSnapshot() {
            return StockPriceSnapshot.builder()
                    .stock(testStock)
                    .price(new BigDecimal("77.90"))
                    .open(new BigDecimal("78.70"))
                    .dayHigh(new BigDecimal("79.15"))
                    .dayLow(new BigDecimal("77.60"))
                    .volume(92_700_000L)
                    .tradeDate(LocalDate.of(2026, 4, 24))
                    .build();
        }

        @Nested
        @DisplayName("Başarılı dönüşüm")
        class HappyPath {

            @Test
            @DisplayName("Snapshot'tan history'e tüm OHLCV alanları doğru aktarılır")
            void snapshotMapsToHistoryWithCorrectFields() {
                StockPriceSnapshot snapshot = fullSnapshot();

                StockPriceHistory history = mapper.toHistoryEntity(snapshot);

                assertThat(history).isNotNull();
                assertThat(history.getStock()).isSameAs(testStock);
                assertThat(history.getTradeDate()).isEqualTo(LocalDate.of(2026, 4, 24));
                assertThat(history.getOpenPrice()).isEqualByComparingTo("78.70");
                assertThat(history.getHighPrice()).isEqualByComparingTo("79.15");
                assertThat(history.getLowPrice()).isEqualByComparingTo("77.60");
                assertThat(history.getVolume()).isEqualTo(92_700_000L);
            }

            @Test
            @DisplayName("snapshot.price → history.closePrice mapping'i (kapanış mantığı)")
            void snapshotPriceBecomesClosePrice() {
                StockPriceSnapshot snapshot = StockPriceSnapshot.builder()
                        .stock(testStock)
                        .price(new BigDecimal("77.90"))
                        .tradeDate(LocalDate.of(2026, 4, 24))
                        .build();

                StockPriceHistory history = mapper.toHistoryEntity(snapshot);

                assertThat(history.getClosePrice()).isEqualByComparingTo("77.90");
            }

            @Test
            @DisplayName("Stock referansı snapshot'tan history'e aynen geçer")
            void stockReferenceIsPropagated() {
                StockPriceSnapshot snapshot = fullSnapshot();

                StockPriceHistory history = mapper.toHistoryEntity(snapshot);

                assertThat(history.getStock()).isSameAs(testStock);
                assertThat(history.getStock().getSymbol()).isEqualTo("AKBNK.IS");
            }
        }

        @Nested
        @DisplayName("Eksik snapshot alanları")
        class MissingSnapshotFields {

            @Test
            @DisplayName("Snapshot'ta open/high/low null ise history'de de null kalır")
            void nullOhlcFieldsRemainNull() {
                StockPriceSnapshot snapshot = StockPriceSnapshot.builder()
                        .stock(testStock)
                        .price(new BigDecimal("77.90"))
                        .open(null)
                        .dayHigh(null)
                        .dayLow(null)
                        .tradeDate(LocalDate.of(2026, 4, 24))
                        .build();

                StockPriceHistory history = mapper.toHistoryEntity(snapshot);

                assertThat(history.getOpenPrice()).isNull();
                assertThat(history.getHighPrice()).isNull();
                assertThat(history.getLowPrice()).isNull();
                assertThat(history.getClosePrice()).isEqualByComparingTo("77.90");
            }

            @Test
            @DisplayName("Snapshot'ta volume null ise history'de de null kalır")
            void nullVolumeRemainsNull() {
                StockPriceSnapshot snapshot = StockPriceSnapshot.builder()
                        .stock(testStock)
                        .price(new BigDecimal("77.90"))
                        .volume(null)
                        .tradeDate(LocalDate.of(2026, 4, 24))
                        .build();

                StockPriceHistory history = mapper.toHistoryEntity(snapshot);

                assertThat(history.getVolume()).isNull();
            }

            @Test
            @DisplayName("Snapshot'ta tradeDate null ise history'de de null kalır")
            void nullTradeDateRemainsNull() {
                StockPriceSnapshot snapshot = StockPriceSnapshot.builder()
                        .stock(testStock)
                        .price(new BigDecimal("77.90"))
                        .tradeDate(null)
                        .build();

                StockPriceHistory history = mapper.toHistoryEntity(snapshot);

                assertThat(history.getTradeDate()).isNull();
            }
        }

        @Nested
        @DisplayName("İki adımlı pipeline (DTO → Snapshot → History)")
        class TwoStepPipeline {

            @Test
            @DisplayName("Yahoo DTO → Snapshot → History zinciri tutarlı veri üretir")
            void dtoToSnapshotToHistoryProducesConsistentData() {
                YahooQuoteResult dto = fullQuote();

                StockPriceSnapshot snapshot = mapper.toSnapshotEntity(dto, testStock);

                // tradeDate normalde @PrePersist'te set olur, manuel veriyoruz
                StockPriceSnapshot snapshotWithDate = StockPriceSnapshot.builder()
                        .stock(snapshot.getStock())
                        .price(snapshot.getPrice())
                        .open(snapshot.getOpen())
                        .dayHigh(snapshot.getDayHigh())
                        .dayLow(snapshot.getDayLow())
                        .volume(snapshot.getVolume())
                        .tradeDate(LocalDate.of(2026, 4, 24))
                        .build();

                StockPriceHistory history = mapper.toHistoryEntity(snapshotWithDate);

                assertThat(history.getOpenPrice()).isEqualByComparingTo("78.70");
                assertThat(history.getHighPrice()).isEqualByComparingTo("79.15");
                assertThat(history.getLowPrice()).isEqualByComparingTo("77.60");
                assertThat(history.getClosePrice()).isEqualByComparingTo("77.90");
                assertThat(history.getVolume()).isEqualTo(92_700_000L);
                assertThat(history.getStock()).isSameAs(testStock);
            }
        }
    }
}
