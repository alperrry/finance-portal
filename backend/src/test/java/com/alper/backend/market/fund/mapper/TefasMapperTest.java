package com.alper.backend.market.fund.mapper;

import com.alper.backend.market.fund.dto.TefasHistoryAllocation;
import com.alper.backend.market.fund.dto.TefasHistoryInfo;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("TefasMapper")
class TefasMapperTest {

    private TefasMapper mapper;
    private Fund testFund;

    @BeforeEach
    void setUp() {
        mapper = new TefasMapper();
        testFund = Fund.builder()
                .id(1L)
                .code("MAC")
                .name("Test Fund")
                .fundType("YAT")
                .build();
    }

    // Helper: bir LocalDate'i Istanbul saat diliminde gece yarısına denk gelen
    // epoch millis string'ine çevirir. TEFAS bu formatta tarih gönderir.
    private static String istanbulMidnightEpochMillis(LocalDate date) {
        long epochMillis = date.atStartOfDay(ZoneId.of("Europe/Istanbul"))
                .toInstant()
                .toEpochMilli();
        return String.valueOf(epochMillis);
    }

    // Helper: TefasHistoryInfo (setter-based, builder yok)
    private TefasHistoryInfo buildHistoryInfo(LocalDate date,
                                               BigDecimal price,
                                               BigDecimal totalShares,
                                               BigDecimal investorCount,
                                               BigDecimal portfolioSize) {
        TefasHistoryInfo dto = new TefasHistoryInfo();
        dto.setTarih(istanbulMidnightEpochMillis(date));
        dto.setFiyat(price);
        dto.setTedPaySayisi(totalShares);
        dto.setKisiSayisi(investorCount);
        dto.setPortfoyBuyukluk(portfolioSize);
        return dto;
    }

    // ============================================================
    // toFundPriceEntity
    // ============================================================

    @Nested
    @DisplayName("toFundPriceEntity")
    class ToFundPriceTests {

        @Nested
        @DisplayName("Başarılı dönüşüm")
        class HappyPath {

            @Test
            @DisplayName("Tüm alanları dolu DTO başarıyla FundPrice'a dönüşür")
            void fullDtoMapsToFundPrice() {
                LocalDate date = LocalDate.of(2026, 4, 24);
                TefasHistoryInfo dto = buildHistoryInfo(
                        date,
                        new BigDecimal("12.345678"),
                        new BigDecimal("100000000.00"),
                        BigDecimal.valueOf(15000),
                        new BigDecimal("1234567890.50")
                );

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                assertThat(price).isNotNull();
                assertThat(price.getFund()).isSameAs(testFund);
                assertThat(price.getPriceDate()).isEqualTo(date);
                assertThat(price.getPrice()).isEqualByComparingTo("12.345678");
                assertThat(price.getTotalShares()).isEqualByComparingTo("100000000.00");
                assertThat(price.getInvestorCount()).isEqualTo(15000);
                assertThat(price.getPortfolioSize()).isEqualByComparingTo("1234567890.50");
            }

            @Test
            @DisplayName("Fund referansı price entity'sine aynen geçer")
            void fundReferenceIsPropagated() {
                TefasHistoryInfo dto = buildHistoryInfo(
                        LocalDate.of(2026, 4, 24),
                        new BigDecimal("10.0"), null, null, null);

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                assertThat(price.getFund()).isSameAs(testFund);
                assertThat(price.getFund().getCode()).isEqualTo("MAC");
            }

            @Test
            @DisplayName("İstanbul saat diliminde gece yarısı epoch'u doğru tarihe dönüşür")
            void istanbulMidnightConvertsToSameLocalDate() {
                LocalDate date = LocalDate.of(2026, 1, 15);
                TefasHistoryInfo dto = buildHistoryInfo(
                        date, new BigDecimal("10.0"), null, null, null);

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                assertThat(price.getPriceDate()).isEqualTo(date);
            }

            @Test
            @DisplayName("UTC gece yarısı + 4 saat (İstanbul'da hâlâ aynı gün) doğru parse edilir")
            void utcMidnightStaysAtSameDayInIstanbul() {
                // 2026-04-24 02:00 UTC = 2026-04-24 05:00 Istanbul → aynı gün
                long epochMillis = ZonedDateTime.of(2026, 4, 24, 2, 0, 0, 0, ZoneId.of("UTC"))
                        .toInstant()
                        .toEpochMilli();
                TefasHistoryInfo dto = new TefasHistoryInfo();
                dto.setTarih(String.valueOf(epochMillis));
                dto.setFiyat(new BigDecimal("10.0"));

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                assertThat(price.getPriceDate()).isEqualTo(LocalDate.of(2026, 4, 24));
            }

            @Test
            @DisplayName("UTC gece yarısı (İstanbul +3, hâlâ aynı gün) doğru parse edilir")
            void utcMidnightAtIstanbulIsSameDay() {
                // 2026-04-24 00:00 UTC = 2026-04-24 03:00 Istanbul → aynı gün
                long epochMillis = ZonedDateTime.of(2026, 4, 24, 0, 0, 0, 0, ZoneId.of("UTC"))
                        .toInstant()
                        .toEpochMilli();
                TefasHistoryInfo dto = new TefasHistoryInfo();
                dto.setTarih(String.valueOf(epochMillis));
                dto.setFiyat(new BigDecimal("10.0"));

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                assertThat(price.getPriceDate()).isEqualTo(LocalDate.of(2026, 4, 24));
            }

            @Test
            @DisplayName("UTC öncesi gece yarısı (İstanbul'da yeni gün başlamış) bir sonraki güne kayar")
            void utc21RollsOverToNextIstanbulDay() {
                // 2026-04-24 22:00 UTC = 2026-04-25 01:00 Istanbul → ertesi gün!
                long epochMillis = ZonedDateTime.of(2026, 4, 24, 22, 0, 0, 0, ZoneId.of("UTC"))
                        .toInstant()
                        .toEpochMilli();
                TefasHistoryInfo dto = new TefasHistoryInfo();
                dto.setTarih(String.valueOf(epochMillis));
                dto.setFiyat(new BigDecimal("10.0"));

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                // İstanbul timezone'da 25 Nisan'a düşer
                assertThat(price.getPriceDate()).isEqualTo(LocalDate.of(2026, 4, 25));
            }
        }

        @Nested
        @DisplayName("Null alan davranışı")
        class NullFieldBehavior {

            @Test
            @DisplayName("Optional alanlar (totalShares, investorCount, portfolioSize) null olabilir")
            void optionalFieldsCanBeNull() {
                TefasHistoryInfo dto = buildHistoryInfo(
                        LocalDate.of(2026, 4, 24),
                        new BigDecimal("10.0"),
                        null,  // totalShares
                        null,  // investorCount
                        null   // portfolioSize
                );

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                assertThat(price.getPrice()).isEqualByComparingTo("10.0");
                assertThat(price.getTotalShares()).isNull();
                assertThat(price.getInvestorCount()).isNull();
                assertThat(price.getPortfolioSize()).isNull();
            }

            @Test
            @DisplayName("kisiSayisi BigDecimal'dan Integer'a doğru dönüştürülür")
            void kisiSayisiBigDecimalConvertsToInteger() {
                TefasHistoryInfo dto = buildHistoryInfo(
                        LocalDate.of(2026, 4, 24),
                        new BigDecimal("10.0"),
                        null,
                        new BigDecimal("12345.99"),  // BigDecimal'dan int'e geçecek
                        null
                );

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                // BigDecimal.intValue() ondalığı atar, 12345 olur
                assertThat(price.getInvestorCount()).isEqualTo(12345);
            }

            @Test
            @DisplayName("kisiSayisi null olduğunda investorCount null kalır (NPE atılmaz)")
            void nullKisiSayisiResultsInNullInvestorCount() {
                TefasHistoryInfo dto = buildHistoryInfo(
                        LocalDate.of(2026, 4, 24),
                        new BigDecimal("10.0"),
                        null, null, null
                );

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                assertThat(price.getInvestorCount()).isNull();
            }

            @Test
            @DisplayName("Çok büyük kisiSayisi int overflow yapar (POTENSİYEL BUG dokümantasyonu)")
            void veryLargeKisiSayisiOverflowsToInt() {
                // BigDecimal.intValue() Long range dışına taşıdığında overflow yapar.
                // Pratikte yatırımcı sayısı 2 milyarı geçmez ama mapper bu kontrolü yapmıyor.
                // Bu test mevcut davranışı dokümante eder: değer overflow olur, exception atmaz.
                TefasHistoryInfo dto = buildHistoryInfo(
                        LocalDate.of(2026, 4, 24),
                        new BigDecimal("10.0"),
                        null,
                        new BigDecimal("3000000000"),  // 3 milyar, int max'ı (2.1B) aşıyor
                        null
                );

                FundPrice price = mapper.toFundPriceEntity(dto, testFund);

                // Overflow olduğu için sonuç negatif veya yanlış pozitif olur
                // Beklenen: yine de exception atmadan bir Integer döner
                assertThat(price.getInvestorCount()).isNotNull();
                // Spesifik değer overflow kuralına göre değişir, ama orijinal değer DEĞİL
                assertThat(price.getInvestorCount()).isNotEqualTo(3_000_000_000L);
            }
        }

        @Nested
        @DisplayName("Geçersiz tarih senaryoları")
        class InvalidDateScenarios {

            @Test
            @DisplayName("tarih null ise NumberFormatException fırlatılır")
            void nullTarihThrowsException() {
                // Long.parseLong(null) -> NumberFormatException("Cannot parse null string")
                // Bu Java standart davranışıdır, NPE'ye dönüştürmez.
                TefasHistoryInfo dto = new TefasHistoryInfo();
                dto.setTarih(null);
                dto.setFiyat(new BigDecimal("10.0"));

                assertThrows(NumberFormatException.class,
                        () -> mapper.toFundPriceEntity(dto, testFund));
            }

            @Test
            @DisplayName("Sayı olmayan ISO-benzeri tarih DateTimeParseException fırlatır")
            void nonNumericTarihThrowsException() {
                TefasHistoryInfo dto = new TefasHistoryInfo();
                dto.setTarih("not-a-number");
                dto.setFiyat(new BigDecimal("10.0"));

                assertThrows(DateTimeParseException.class,
                        () -> mapper.toFundPriceEntity(dto, testFund));
            }

            @Test
            @DisplayName("Boş string tarih NumberFormatException fırlatır")
            void emptyTarihThrowsException() {
                TefasHistoryInfo dto = new TefasHistoryInfo();
                dto.setTarih("");
                dto.setFiyat(new BigDecimal("10.0"));

                assertThrows(NumberFormatException.class,
                        () -> mapper.toFundPriceEntity(dto, testFund));
            }

            @Test
            @DisplayName("Eski TEFAS formatı '/Date(...)/' NumberFormatException fırlatır")
            void oldTefasDateFormatThrowsException() {
                // TEFAS bu format'ı geçmişte kullanmış olabilir, mapper bunu desteklemiyor
                TefasHistoryInfo dto = new TefasHistoryInfo();
                dto.setTarih("/Date(1737504000000)/");
                dto.setFiyat(new BigDecimal("10.0"));

                assertThrows(NumberFormatException.class,
                        () -> mapper.toFundPriceEntity(dto, testFund));
            }
        }
    }

    // ============================================================
    // toFundAllocationEntity
    // ============================================================

    @Nested
    @DisplayName("toFundAllocationEntity")
    class ToFundAllocationTests {

        // Helper: tüm field'lar dolu allocation DTO
        private TefasHistoryAllocation buildAllocation(LocalDate date) {
            TefasHistoryAllocation dto = new TefasHistoryAllocation();
            dto.setTarih(istanbulMidnightEpochMillis(date));
            dto.setHs  (new BigDecimal("45.5000"));
            dto.setYhs (new BigDecimal("5.0000"));
            dto.setKb  (new BigDecimal("15.0000"));
            dto.setOb  (new BigDecimal("8.0000"));
            dto.setYkb (new BigDecimal("2.0000"));
            dto.setYob (new BigDecimal("1.0000"));
            dto.setTpp (new BigDecimal("3.0000"));
            dto.setVdm (new BigDecimal("4.0000"));
            dto.setVm  (new BigDecimal("0.5000"));
            dto.setR   (new BigDecimal("2.5000"));
            dto.setT   (new BigDecimal("1.5000"));
            dto.setD   (new BigDecimal("6.0000"));
            dto.setGas (new BigDecimal("3.0000"));
            dto.setByf (new BigDecimal("2.0000"));
            dto.setVint(new BigDecimal("1.0000"));
            dto.setDiger(new BigDecimal("0.0000"));
            return dto;
        }

        @Nested
        @DisplayName("Başarılı dönüşüm")
        class HappyPath {

            @Test
            @DisplayName("Tüm 16 yüzde alanı doğru sırada FundAllocation'a dönüşür")
            void allFieldsMapToCorrectAllocationFields() {
                LocalDate date = LocalDate.of(2026, 4, 24);
                TefasHistoryAllocation dto = buildAllocation(date);

                FundAllocation alloc = mapper.toFundAllocationEntity(dto, testFund);

                assertThat(alloc).isNotNull();
                assertThat(alloc.getFund()).isSameAs(testFund);
                assertThat(alloc.getAllocationDate()).isEqualTo(date);
                assertThat(alloc.getHs()  ).isEqualByComparingTo("45.5000");
                assertThat(alloc.getYhs() ).isEqualByComparingTo("5.0000");
                assertThat(alloc.getKb()  ).isEqualByComparingTo("15.0000");
                assertThat(alloc.getOb()  ).isEqualByComparingTo("8.0000");
                assertThat(alloc.getYkb() ).isEqualByComparingTo("2.0000");
                assertThat(alloc.getYob() ).isEqualByComparingTo("1.0000");
                assertThat(alloc.getTpp() ).isEqualByComparingTo("3.0000");
                assertThat(alloc.getVdm() ).isEqualByComparingTo("4.0000");
                assertThat(alloc.getVm()  ).isEqualByComparingTo("0.5000");
                assertThat(alloc.getR()   ).isEqualByComparingTo("2.5000");
                assertThat(alloc.getT()   ).isEqualByComparingTo("1.5000");
                assertThat(alloc.getD()   ).isEqualByComparingTo("6.0000");
                assertThat(alloc.getGas() ).isEqualByComparingTo("3.0000");
                assertThat(alloc.getByf() ).isEqualByComparingTo("2.0000");
                assertThat(alloc.getVint()).isEqualByComparingTo("1.0000");
                assertThat(alloc.getDiger()).isEqualByComparingTo("0.0000");
            }

            @Test
            @DisplayName("DTO 'ob' field'ı (TEFAS'ın 'DB' key'i) entity 'ob' field'ına yazılır")
            void dtoObMapsToEntityOb() {
                // TEFAS JSON'unda "DB" key'i geliyor (Diş Borçlanma sanırım?)
                // DTO'da @JsonProperty("DB") -> 'ob' field'ı
                // Entity'de 'ob' = Özel Sektör Borçlanma %
                // Bu mapping mapper testiyle doğrulanır.
                TefasHistoryAllocation dto = new TefasHistoryAllocation();
                dto.setTarih(istanbulMidnightEpochMillis(LocalDate.of(2026, 4, 24)));
                dto.setOb(new BigDecimal("12.34"));

                FundAllocation alloc = mapper.toFundAllocationEntity(dto, testFund);

                assertThat(alloc.getOb()).isEqualByComparingTo("12.34");
            }

            @Test
            @DisplayName("vdm ve vm field'ları kendi DTO field'larına bağlı kalır (swap kontrolü)")
            void vdmAndVmAreNotSwapped() {
                // DİKKAT: TEFAS API'sinde "VMTL" -> dto.vdm, "VDM" -> dto.vm mapping'i var.
                // Bu isimler kafa karıştırıcı; doğru sıralandığını test'le doğruluyoruz.
                // Mapper sadece dto.vdm -> entity.vdm, dto.vm -> entity.vm yapar.
                // TEFAS JSON key'lerinin doğru field'a düştüğü ayrı bir endişe (Jackson işi).
                TefasHistoryAllocation dto = new TefasHistoryAllocation();
                dto.setTarih(istanbulMidnightEpochMillis(LocalDate.of(2026, 4, 24)));
                dto.setVdm(new BigDecimal("4.0000")); // Vadeli mevduat
                dto.setVm(new BigDecimal("0.5000"));  // Vadesiz mevduat

                FundAllocation alloc = mapper.toFundAllocationEntity(dto, testFund);

                assertThat(alloc.getVdm()).isEqualByComparingTo("4.0000");
                assertThat(alloc.getVm()).isEqualByComparingTo("0.5000");
                // Entity tarafında swap olmadığını doğruladık.
            }

            @Test
            @DisplayName("Tüm allocation field'ları null olsa bile entity üretilir")
            void allNullAllocationFieldsProduceEntityWithNulls() {
                TefasHistoryAllocation dto = new TefasHistoryAllocation();
                dto.setTarih(istanbulMidnightEpochMillis(LocalDate.of(2026, 4, 24)));
                // Hiçbir allocation alanı set edilmedi

                FundAllocation alloc = mapper.toFundAllocationEntity(dto, testFund);

                assertThat(alloc.getHs()).isNull();
                assertThat(alloc.getYhs()).isNull();
                assertThat(alloc.getKb()).isNull();
                assertThat(alloc.getDiger()).isNull();
                // Fund ve tarih hâlâ dolu
                assertThat(alloc.getFund()).isSameAs(testFund);
                assertThat(alloc.getAllocationDate()).isEqualTo(LocalDate.of(2026, 4, 24));
            }

            @Test
            @DisplayName("Allocation yüzdeleri toplamı 100 civarı olabilir (mapper toplam kontrolü yapmaz)")
            void allocationsCanSumToAnyValue() {
                // Mapper iş kuralı uygulamaz, TEFAS'tan gelen değerleri olduğu gibi taşır.
                // Yüzdeler toplamının 100 olmaması durumu mapper'ın işi değil.
                TefasHistoryAllocation dto = new TefasHistoryAllocation();
                dto.setTarih(istanbulMidnightEpochMillis(LocalDate.of(2026, 4, 24)));
                dto.setHs(new BigDecimal("99.0000"));
                dto.setKb(new BigDecimal("99.0000"));  // Toplam 198, gerçekçi değil ama kabul

                FundAllocation alloc = mapper.toFundAllocationEntity(dto, testFund);

                assertThat(alloc.getHs()).isEqualByComparingTo("99.0000");
                assertThat(alloc.getKb()).isEqualByComparingTo("99.0000");
            }

            @Test
            @DisplayName("Negatif allocation değeri mapper tarafından engellenmez")
            void negativeAllocationIsNotBlocked() {
                // Mapper iş kuralı sahibi değil, negatif değerleri olduğu gibi taşır.
                // Validation upstream'de yapılmalı.
                TefasHistoryAllocation dto = new TefasHistoryAllocation();
                dto.setTarih(istanbulMidnightEpochMillis(LocalDate.of(2026, 4, 24)));
                dto.setDiger(new BigDecimal("-5.0000"));

                FundAllocation alloc = mapper.toFundAllocationEntity(dto, testFund);

                assertThat(alloc.getDiger()).isEqualByComparingTo("-5.0000");
            }
        }

        @Nested
        @DisplayName("Geçersiz tarih senaryoları")
        class InvalidDateScenarios {

            @Test
            @DisplayName("tarih null ise NumberFormatException fırlatılır (allocation method için de aynı davranış)")
            void nullTarihThrowsException() {
                // Long.parseLong(null) -> NumberFormatException
                // toFundPriceEntity ile aynı davranış
                TefasHistoryAllocation dto = new TefasHistoryAllocation();
                dto.setTarih(null);

                assertThrows(NumberFormatException.class,
                        () -> mapper.toFundAllocationEntity(dto, testFund));
            }

            @Test
            @DisplayName("Geçersiz format tarih NumberFormatException fırlatır")
            void invalidFormatThrowsException() {
                TefasHistoryAllocation dto = new TefasHistoryAllocation();
                dto.setTarih("xyz");

                assertThrows(NumberFormatException.class,
                        () -> mapper.toFundAllocationEntity(dto, testFund));
            }
        }
    }
}
