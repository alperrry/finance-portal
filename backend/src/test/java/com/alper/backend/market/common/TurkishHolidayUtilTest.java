package com.alper.backend.market.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TurkishHolidayUtil")
class TurkishHolidayUtilTest {

    @Nested
    @DisplayName("isHoliday")
    class IsHolidayTests {

        @Test
        @DisplayName("Cumartesi tatil sayılır")
        void saturdayIsHoliday() {
            LocalDate saturday = LocalDate.of(2026, 4, 25);
            assertThat(saturday.getDayOfWeek().getValue()).isEqualTo(6);
            assertThat(TurkishHolidayUtil.isHoliday(saturday)).isTrue();
        }

        @Test
        @DisplayName("Pazar tatil sayılır")
        void sundayIsHoliday() {
            LocalDate sunday = LocalDate.of(2026, 4, 26);
            assertThat(sunday.getDayOfWeek().getValue()).isEqualTo(7);
            assertThat(TurkishHolidayUtil.isHoliday(sunday)).isTrue();
        }

        @Test
        @DisplayName("Sıradan iş günü tatil sayılmaz")
        void regularWeekdayIsNotHoliday() {
            // 2026-03-04 Çarşamba, herhangi bir resmi tatil değil
            LocalDate weekday = LocalDate.of(2026, 3, 4);
            assertThat(TurkishHolidayUtil.isHoliday(weekday)).isFalse();
        }

        @Test
        @DisplayName("Yılbaşı (1 Ocak) tatil sayılır")
        void newYearIsHoliday() {
            // 2026-01-01 Perşembe, hafta sonu değil ama yılbaşı
            LocalDate newYear = LocalDate.of(2026, 1, 1);
            assertThat(TurkishHolidayUtil.isHoliday(newYear)).isTrue();
        }

        @Test
        @DisplayName("23 Nisan Ulusal Egemenlik Bayramı tatil sayılır")
        void aprilTwentyThirdIsHoliday() {
            // 2026-04-23 Perşembe, hafta içi
            LocalDate apr23 = LocalDate.of(2026, 4, 23);
            assertThat(TurkishHolidayUtil.isHoliday(apr23)).isTrue();
        }

        @Test
        @DisplayName("29 Ekim Cumhuriyet Bayramı tatil sayılır")
        void republicDayIsHoliday() {
            // 2026-10-29 Perşembe, hafta içi
            LocalDate oct29 = LocalDate.of(2026, 10, 29);
            assertThat(TurkishHolidayUtil.isHoliday(oct29)).isTrue();
        }

        @Test
        @DisplayName("1 Mayıs Emek Bayramı tatil sayılır")
        void mayDayIsHoliday() {
            // 2026-05-01 Cuma
            LocalDate may1 = LocalDate.of(2026, 5, 1);
            assertThat(TurkishHolidayUtil.isHoliday(may1)).isTrue();
        }
    }

    @Nested
    @DisplayName("isTradingDay")
    class IsTradingDayTests {

        @Test
        @DisplayName("Sıradan iş günü trading day'dir")
        void regularWeekdayIsTradingDay() {
            LocalDate weekday = LocalDate.of(2026, 3, 4); // Çarşamba
            assertThat(TurkishHolidayUtil.isTradingDay(weekday)).isTrue();
        }

        @Test
        @DisplayName("Cumartesi trading day değildir")
        void saturdayIsNotTradingDay() {
            LocalDate saturday = LocalDate.of(2026, 4, 25);
            assertThat(TurkishHolidayUtil.isTradingDay(saturday)).isFalse();
        }

        @Test
        @DisplayName("Resmi tatil trading day değildir")
        void officialHolidayIsNotTradingDay() {
            LocalDate newYear = LocalDate.of(2026, 1, 1);
            assertThat(TurkishHolidayUtil.isTradingDay(newYear)).isFalse();
        }
    }

    @Nested
    @DisplayName("lastCompletedTradingDay")
    class LastCompletedTradingDayTests {

        @Test
        @DisplayName("Sıradan Salı için bir önceki Pazartesi'yi döner")
        void tuesdayReturnsMonday() {
            // 2026-03-03 Salı → 2026-03-02 Pazartesi
            LocalDate tuesday = LocalDate.of(2026, 3, 3);
            LocalDate result = TurkishHolidayUtil.lastCompletedTradingDay(tuesday);
            assertThat(result).isEqualTo(LocalDate.of(2026, 3, 2));
        }

        @Test
        @DisplayName("Pazartesi için önceki Cuma'yı döner (hafta sonu atlanır)")
        void mondayReturnsPriorFriday() {
            // 2026-03-02 Pazartesi → 2026-02-27 Cuma
            LocalDate monday = LocalDate.of(2026, 3, 2);
            LocalDate result = TurkishHolidayUtil.lastCompletedTradingDay(monday);
            assertThat(result).isEqualTo(LocalDate.of(2026, 2, 27));
        }

        @Test
        @DisplayName("Bayram sonrası ilk iş günü için bayram öncesi son trading day döner")
        void afterHolidayReturnsTradingDayBeforeHoliday() {
            // 2026-04-24 Cuma → 2026-04-22 Çarşamba (23 Nisan tatili atlanır)
            LocalDate afterApril23 = LocalDate.of(2026, 4, 24);
            LocalDate result = TurkishHolidayUtil.lastCompletedTradingDay(afterApril23);
            assertThat(result).isEqualTo(LocalDate.of(2026, 4, 22));
        }

        @Test
        @DisplayName("Sonuç her zaman bir trading day olmalı")
        void resultIsAlwaysATradingDay() {
            LocalDate any = LocalDate.of(2026, 5, 4); // Pazartesi (1 Mayıs Cuma tatil)
            LocalDate result = TurkishHolidayUtil.lastCompletedTradingDay(any);
            assertThat(TurkishHolidayUtil.isTradingDay(result)).isTrue();
        }
    }

    @Nested
    @DisplayName("countTradingDays")
    class CountTradingDaysTests {

        @Test
        @DisplayName("Pazartesi-Cuma arası 5 trading day döner")
        void fullWorkWeekHasFiveTradingDays() {
            // 2026-03-02 Pazartesi → 2026-03-06 Cuma (hiç tatil yok)
            LocalDate start = LocalDate.of(2026, 3, 2);
            LocalDate end   = LocalDate.of(2026, 3, 6);
            long count = TurkishHolidayUtil.countTradingDays(start, end);
            assertThat(count).isEqualTo(5);
        }

        @Test
        @DisplayName("Tam hafta (Pzt-Pzt) 6 trading day döner (hafta sonu atlanır)")
        void fullWeekHasSixTradingDays() {
            // 2026-03-02 Pzt → 2026-03-09 Pzt = 8 gün, hafta sonu 2 gün, 6 trading
            LocalDate start = LocalDate.of(2026, 3, 2);
            LocalDate end   = LocalDate.of(2026, 3, 9);
            long count = TurkishHolidayUtil.countTradingDays(start, end);
            assertThat(count).isEqualTo(6);
        }

        @Test
        @DisplayName("Aynı gün start=end ise iş günü için 1, tatil için 0 döner")
        void sameDayStartAndEnd() {
            LocalDate weekday = LocalDate.of(2026, 3, 4); // Çarşamba
            assertThat(TurkishHolidayUtil.countTradingDays(weekday, weekday)).isEqualTo(1);

            LocalDate saturday = LocalDate.of(2026, 4, 25);
            assertThat(TurkishHolidayUtil.countTradingDays(saturday, saturday)).isEqualTo(0);
        }

        @Test
        @DisplayName("23 Nisan içeren haftada bir trading day eksik döner")
        void weekWithApril23HasOneFewerTradingDay() {
            // 2026-04-20 Pzt → 2026-04-24 Cuma = normalde 5, ama 23 Nisan tatil = 4
            LocalDate start = LocalDate.of(2026, 4, 20);
            LocalDate end   = LocalDate.of(2026, 4, 24);
            long count = TurkishHolidayUtil.countTradingDays(start, end);
            assertThat(count).isEqualTo(4);
        }
    }
}
