package com.alper.backend.market.fx.mapper;

import com.alper.backend.market.fx.dto.TcmbCurrency;
import com.alper.backend.market.fx.dto.TcmbResponse;
import com.alper.backend.market.fx.model.ExchangeRate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TcmbMapper")
class TcmbMapperTest {

    private TcmbMapper mapper;
    private static final LocalDate RATE_DATE = LocalDate.of(2026, 4, 25);

    @BeforeEach
    void setUp() {
        mapper = new TcmbMapper();
    }

    // ---------- Helper'lar ----------

    private TcmbCurrency tcmbCurrency(String code, String name, Integer unit,
                                       String buying, String selling) {
        return TcmbCurrency.builder()
                .currencyCode(code)
                .currencyName(name)
                .unit(unit)
                .forexBuying(buying)
                .forexSelling(selling)
                .build();
    }

    private TcmbResponse responseOf(TcmbCurrency... currencies) {
        return TcmbResponse.builder()
                .rateDate(RATE_DATE)
                .currencies(List.of(currencies))
                .build();
    }

    // ---------- Happy path ----------

    @Nested
    @DisplayName("Başarılı parsing senaryoları")
    class HappyPath {

        @Test
        @DisplayName("Tek bir USD kuru başarıyla ExchangeRate'e dönüşür")
        void singleUsdMapsToExchangeRate() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "32.4850", "32.5430")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(1);
            ExchangeRate rate = result.get(0);
            assertThat(rate.getCurrencyCode()).isEqualTo("USD");
            assertThat(rate.getCurrencyName()).isEqualTo("US DOLLAR");
            assertThat(rate.getUnit()).isEqualTo(1);
            assertThat(rate.getForexBuying()).isEqualByComparingTo("32.4850");
            assertThat(rate.getForexSelling()).isEqualByComparingTo("32.5430");
            assertThat(rate.getRateDate()).isEqualTo(RATE_DATE);
            assertThat(rate.getSource()).isEqualTo("TCMB");
        }

        @Test
        @DisplayName("Birden fazla kur ayrı ExchangeRate'lere dönüşür")
        void multipleCurrenciesMapToMultipleEntities() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR",  1,   "32.4850", "32.5430"),
                    tcmbCurrency("EUR", "EURO",       1,   "35.1240", "35.2010"),
                    tcmbCurrency("JPY", "JAPON YENI", 100, "21.4520", "21.5610")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(3);
            assertThat(result).extracting(ExchangeRate::getCurrencyCode)
                    .containsExactly("USD", "EUR", "JPY");
        }

        @Test
        @DisplayName("JPY gibi yüksek unit'li para birimleri doğru taşınır")
        void highUnitCurrencyPreservesUnit() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("JPY", "JAPON YENI", 100, "21.4520", "21.5610")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result.get(0).getUnit()).isEqualTo(100);
        }

        @Test
        @DisplayName("rateDate response seviyesinden tüm entity'lere kopyalanır")
        void rateDateIsPropagatedToAllEntities() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "32.48", "32.54"),
                    tcmbCurrency("EUR", "EURO",      1, "35.12", "35.20"),
                    tcmbCurrency("GBP", "STERLIN",   1, "40.10", "40.25")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            for (ExchangeRate rate : result) {
                assertThat(rate.getRateDate()).isEqualTo(RATE_DATE);
            }
        }

        @Test
        @DisplayName("Source alanı her entity için 'TCMB' olarak set edilir")
        void sourceIsAlwaysTcmb() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "32.48", "32.54"),
                    tcmbCurrency("EUR", "EURO",      1, "35.12", "35.20")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).allSatisfy(rate ->
                    assertThat(rate.getSource()).isEqualTo("TCMB"));
        }

        @Test
        @DisplayName("Boş currency listesi boş sonuç döner")
        void emptyCurrencyListReturnsEmptyResult() {
            TcmbResponse response = TcmbResponse.builder()
                    .rateDate(RATE_DATE)
                    .currencies(Collections.emptyList())
                    .build();

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).isNotNull().isEmpty();
        }
    }

    // ---------- Sad path: nullable kurlar ----------

    @Nested
    @DisplayName("Eksik alış/satış kurları (TCMB'de bilinçli null)")
    class NullableForexValues {

        @Test
        @DisplayName("forexBuying null olan kur null buying ile entity üretir")
        void nullForexBuyingResultsInNullField() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("XDR", "OZEL CEKME HAKKI", 1, null, "44.20")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getForexBuying()).isNull();
            assertThat(result.get(0).getForexSelling()).isEqualByComparingTo("44.20");
        }

        @Test
        @DisplayName("forexSelling null olan kur null selling ile entity üretir")
        void nullForexSellingResultsInNullField() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("XDR", "OZEL CEKME HAKKI", 1, "44.10", null)
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getForexBuying()).isEqualByComparingTo("44.10");
            assertThat(result.get(0).getForexSelling()).isNull();
        }

        @Test
        @DisplayName("Hem alış hem satış null ise her ikisi de null kalır (entity yine üretilir)")
        void bothBuyingAndSellingNullProducesEntityWithNulls() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("XYZ", "TEST CURRENCY", 1, null, null)
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            // Mapper currency'i atlamaz, entity üretir
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getForexBuying()).isNull();
            assertThat(result.get(0).getForexSelling()).isNull();
            assertThat(result.get(0).getCurrencyCode()).isEqualTo("XYZ");
        }

        @Test
        @DisplayName("Boş string forex değeri null'a dönüşür")
        void emptyStringForexBecomesNull() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "", "")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getForexBuying()).isNull();
            assertThat(result.get(0).getForexSelling()).isNull();
        }

        @Test
        @DisplayName("Sadece boşluk içeren forex değeri null'a dönüşür (isBlank kontrolü)")
        void whitespaceOnlyForexBecomesNull() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "   ", "  ")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result.get(0).getForexBuying()).isNull();
            assertThat(result.get(0).getForexSelling()).isNull();
        }
    }

    // ---------- Sad path: parsing hataları ----------

    @Nested
    @DisplayName("Geçersiz format senaryoları (NFR-18 sad path)")
    class ParsingErrors {

        @Test
        @DisplayName("Geçersiz sayı formatı NumberFormatException'ı yutar, null döner")
        void invalidNumberFormatBecomesNull() {
            // Mapper davranışı: parseBigDecimal NFE'yi yakalar, null döner.
            // Bunu test'le çiviliyoruz — entity yine üretilir, ilgili kur null kalır.
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "not-a-number", "32.54")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getForexBuying()).isNull();
            assertThat(result.get(0).getForexSelling()).isEqualByComparingTo("32.54");
        }

        @Test
        @DisplayName("Etrafı boşluklu sayı trim'lenip parse edilir")
        void rateWithSurroundingWhitespaceIsTrimmed() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "  32.4850  ", "  32.5430  ")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result.get(0).getForexBuying()).isEqualByComparingTo("32.4850");
            assertThat(result.get(0).getForexSelling()).isEqualByComparingTo("32.5430");
        }

        @Test
        @DisplayName("Çok yüksek ondalıklı sayı kayıpsız parse edilir")
        void highPrecisionDecimalIsPreserved() {
            // EVDS gibi 8-ondalıklı değerler de gelebilir
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "32.48570123", "32.54300456")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result.get(0).getForexBuying())
                    .isEqualByComparingTo("32.48570123");
            assertThat(result.get(0).getForexSelling())
                    .isEqualByComparingTo("32.54300456");
        }
    }

    // ---------- Edge: birden fazla currency'de farklı durumlar ----------

    @Nested
    @DisplayName("Karışık başarılı/başarısız senaryolar")
    class MixedScenarios {

        @Test
        @DisplayName("Bir currency null kurlu, diğerleri normal — hepsi entity üretir")
        void mixedNullableAndNormalCurrenciesAllProduceEntities() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR",       1, "32.48", "32.54"),
                    tcmbCurrency("XDR", "OZEL CEKME HAKKI", 1, null,    null),
                    tcmbCurrency("EUR", "EURO",             1, "35.12", "35.20")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(3);
            assertThat(result.get(0).getForexBuying()).isNotNull();
            assertThat(result.get(1).getForexBuying()).isNull();
            assertThat(result.get(2).getForexBuying()).isNotNull();
        }

        @Test
        @DisplayName("Bir currency'de geçersiz format, diğerleri normal — hepsi entity üretir, sadece bozuk olan null")
        void mixedValidAndInvalidFormatsCoexist() {
            TcmbResponse response = responseOf(
                    tcmbCurrency("USD", "US DOLLAR", 1, "32.48",        "32.54"),
                    tcmbCurrency("EUR", "EURO",      1, "abc",           "35.20"),
                    tcmbCurrency("GBP", "STERLIN",   1, "40.10",         "40.25")
            );

            List<ExchangeRate> result = mapper.toEntityList(response);

            assertThat(result).hasSize(3);
            assertThat(result.get(0).getForexBuying()).isEqualByComparingTo("32.48");
            assertThat(result.get(1).getForexBuying()).isNull();
            assertThat(result.get(1).getForexSelling()).isEqualByComparingTo("35.20");
            assertThat(result.get(2).getForexBuying()).isEqualByComparingTo("40.10");
        }
    }
}
