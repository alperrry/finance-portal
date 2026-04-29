package com.alper.backend.market.bond.mapper;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.model.BondType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("EvdsMapper")
class EvdsMapperTest {

    private EvdsMapper mapper;
    private Bond testBond;

    @BeforeEach
    void setUp() {
        mapper = new EvdsMapper();
        testBond = Bond.builder()
                .id(1L)
                .evdsSeriesCode("TP.DK.USD.A")
                .name("Test Bond")
                .bondType(BondType.DEVLET_TAHVIL)
                .build();
    }

    // Helper: EVDS API'sinden gelen tipik bir item üretir
    private Map<String, Object> evdsItem(String tarih, String seriesKey, String rate) {
        Map<String, Object> item = new HashMap<>();
        item.put("Tarih", tarih);
        item.put(seriesKey, rate);
        return item;
    }

    // ---------- Happy path ----------

    @Nested
    @DisplayName("Başarılı parsing senaryoları")
    class HappyPath {

        @Test
        @DisplayName("Tek bir item başarıyla BondRateHistory'e dönüştürülür")
        void singleItemMapsToHistory() {
            String seriesCode = "TP.DK.USD.A";
            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", "TP_DK_USD_A", "42.84570000")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, seriesCode, items);

            assertThat(result).hasSize(1);
            BondRateHistory history = result.get(0);
            assertThat(history.getBond()).isSameAs(testBond);
            assertThat(history.getRateDate()).isEqualTo(LocalDate.of(2026, 1, 2));
            assertThat(history.getInterestRate()).isEqualByComparingTo("42.84570000");
            assertThat(history.getSource()).isEqualTo("TCMB_EVDS");
        }

        @Test
        @DisplayName("Birden fazla item ayrı history kayıtlarına dönüşür")
        void multipleItemsMapToMultipleHistories() {
            String seriesCode = "TP.DK.USD.A";
            String key = "TP_DK_USD_A";
            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", key, "42.84"),
                    evdsItem("03-01-2026", key, "42.91"),
                    evdsItem("06-01-2026", key, "43.05")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, seriesCode, items);

            assertThat(result).hasSize(3);
            assertThat(result.get(0).getRateDate()).isEqualTo(LocalDate.of(2026, 1, 2));
            assertThat(result.get(1).getRateDate()).isEqualTo(LocalDate.of(2026, 1, 3));
            assertThat(result.get(2).getRateDate()).isEqualTo(LocalDate.of(2026, 1, 6));
        }

        @Test
        @DisplayName("Series code'daki noktalar alt çizgiye çevrilerek key olarak kullanılır")
        void seriesCodeDotsAreReplacedWithUnderscores() {
            // EVDS series code "TP.RFY01.TCMB" gelir, JSON key'i "TP_RFY01_TCMB" olur
            String seriesCode = "TP.RFY01.TCMB";
            List<Map<String, Object>> items = List.of(
                    evdsItem("15-01-2026", "TP_RFY01_TCMB", "0.4500")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, seriesCode, items);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getInterestRate()).isEqualByComparingTo("0.45");
        }

        @Test
        @DisplayName("Series code zaten alt çizgili gelirse de doğru parse eder")
        void seriesCodeWithoutDotsAlsoWorks() {
            String seriesCode = "TP_RFY01_TCMB";
            List<Map<String, Object>> items = List.of(
                    evdsItem("15-01-2026", "TP_RFY01_TCMB", "0.4500")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, seriesCode, items);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Boş items listesi boş sonuç döner (crash etmez)")
        void emptyItemsReturnsEmptyList() {
            List<BondRateHistory> result = mapper.toEntityList(
                    testBond, "TP.DK.USD.A", Collections.emptyList());

            assertThat(result).isNotNull().isEmpty();
        }
    }

    // ---------- Sad path ----------

    @Nested
    @DisplayName("Hatalı / eksik veri senaryoları (NFR-18 sad path)")
    class SadPath {

        @Test
        @DisplayName("Tarih alanı null olan item atlanır")
        void itemWithNullTarihIsSkipped() {
            String key = "TP_DK_USD_A";
            Map<String, Object> bad = new HashMap<>();
            bad.put("Tarih", null);
            bad.put(key, "42.84");

            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", key, "42.84"),
                    bad,
                    evdsItem("03-01-2026", key, "42.91")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, "TP.DK.USD.A", items);

            // Bozuk item atlanır, geri kalan 2 başarılı
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getRateDate()).isEqualTo(LocalDate.of(2026, 1, 2));
            assertThat(result.get(1).getRateDate()).isEqualTo(LocalDate.of(2026, 1, 3));
        }

        @Test
        @DisplayName("Series değeri null olan item atlanır")
        void itemWithNullRateIsSkipped() {
            String key = "TP_DK_USD_A";
            Map<String, Object> bad = new HashMap<>();
            bad.put("Tarih", "02-01-2026");
            bad.put(key, null);

            List<Map<String, Object>> items = List.of(
                    bad,
                    evdsItem("03-01-2026", key, "42.91")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, "TP.DK.USD.A", items);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getRateDate()).isEqualTo(LocalDate.of(2026, 1, 3));
        }

        @Test
        @DisplayName("Series key item'da hiç yoksa atlanır (null gibi davranır)")
        void itemWithoutSeriesKeyIsSkipped() {
            // Map'te series key hiç yok
            Map<String, Object> noKey = new HashMap<>();
            noKey.put("Tarih", "02-01-2026");
            noKey.put("UNRELATED_KEY", "42.84");

            List<Map<String, Object>> items = List.of(noKey);

            List<BondRateHistory> result = mapper.toEntityList(
                    testBond, "TP.DK.USD.A", items);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Tüm item'ları bozuk olan response boş liste döner")
        void allBadItemsResultInEmptyList() {
            String key = "TP_DK_USD_A";
            Map<String, Object> bad1 = new HashMap<>();
            bad1.put("Tarih", null);
            bad1.put(key, "42.84");

            Map<String, Object> bad2 = new HashMap<>();
            bad2.put("Tarih", "03-01-2026");
            bad2.put(key, null);

            List<BondRateHistory> result = mapper.toEntityList(
                    testBond, "TP.DK.USD.A", List.of(bad1, bad2));

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Geçersiz tarih formatı DateTimeParseException fırlatır (mapper bunu yutmaz)")
        void invalidDateFormatThrowsException() {
            // Mapper LocalDate.parse'i try-catch içinde tutmuyor; bu davranış bilinçli
            // çünkü tarih parse hatası gerçek bir veri kaynağı sorununu işaret eder.
            String key = "TP_DK_USD_A";
            List<Map<String, Object>> items = List.of(
                    evdsItem("2026/01/02", key, "42.84") // yanlış format (yyyy/MM/dd değil)
            );

            // Mapper bu durumu yakalamadığı için exception fırlatmalı
            org.junit.jupiter.api.Assertions.assertThrows(
                    java.time.format.DateTimeParseException.class,
                    () -> mapper.toEntityList(testBond, "TP.DK.USD.A", items)
            );
        }

        @Test
        @DisplayName("Geçersiz sayı formatı interestRate'i null yapar (item yine de eklenir — POTENSİYEL BUG)")
        void invalidNumberFormatLeadsToNullInterestRate() {
            // DİKKAT: Bu test mapper'ın MEVCUT davranışını dokümante eder.
            // parseBigDecimal NumberFormatException'ı yutup null döner.
            // Sonuçta interestRate=null olan bir BondRateHistory üretilir.
            // Veritabanı `interest_rate NOT NULL` kısıtı nedeniyle insert sırasında patlar.
            // İdeal davranış: bu item'ın komple atlanması. Bu davranış değişirse test güncellenmeli.
            String key = "TP_DK_USD_A";
            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", key, "not-a-number")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, "TP.DK.USD.A", items);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getInterestRate()).isNull();
            // Bu null DB'de NOT NULL kısıtına takılır — parse aşamasında atlanması daha doğru olur.
        }

        @Test
        @DisplayName("Sayı içinde boşluk varsa trim'lenir ve parse edilir")
        void rateWithSurroundingWhitespaceIsTrimmed() {
            String key = "TP_DK_USD_A";
            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", key, "  42.84  ")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, "TP.DK.USD.A", items);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getInterestRate()).isEqualByComparingTo("42.84");
        }

        @Test
        @DisplayName("Boş string rate null sonuç verir")
        void emptyRateStringYieldsNull() {
            String key = "TP_DK_USD_A";
            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", key, "")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, "TP.DK.USD.A", items);

            // Boş string null değil, item üretilir ama interestRate null olur
            // (Aynı bug: parseBigDecimal -> isBlank -> null)
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getInterestRate()).isNull();
        }
    }

    // ---------- Bond ilişkisi ----------

    @Nested
    @DisplayName("Bond ilişkisi")
    class BondAssociationTests {

        @Test
        @DisplayName("Tüm üretilen history'ler aynı bond referansını taşır")
        void allHistoriesShareSameBondReference() {
            String key = "TP_DK_USD_A";
            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", key, "42.84"),
                    evdsItem("03-01-2026", key, "42.91"),
                    evdsItem("06-01-2026", key, "43.05")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, "TP.DK.USD.A", items);

            for (BondRateHistory h : result) {
                assertThat(h.getBond()).isSameAs(testBond);
            }
        }

        @Test
        @DisplayName("Source alanı her zaman 'TCMB_EVDS' olarak set edilir")
        void sourceIsAlwaysTcmbEvds() {
            List<Map<String, Object>> items = List.of(
                    evdsItem("02-01-2026", "TP_DK_USD_A", "42.84")
            );

            List<BondRateHistory> result = mapper.toEntityList(testBond, "TP.DK.USD.A", items);

            assertThat(result.get(0).getSource()).isEqualTo("TCMB_EVDS");
        }
    }
}
