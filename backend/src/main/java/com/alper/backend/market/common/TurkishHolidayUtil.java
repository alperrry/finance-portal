package com.alper.backend.market.common;

import com.github.msarhan.ummalqura.calendar.UmmalquraCalendar;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

public class TurkishHolidayUtil {

    private TurkishHolidayUtil() {}

    // Sabit milli tatiller (ay-gün)
    private static final Set<String> FIXED_HOLIDAYS = Set.of(
            "01-01", // Yılbaşı
            "04-23", // Ulusal Egemenlik ve Çocuk Bayramı
            "05-01", // Emek ve Dayanışma Günü
            "05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
            "07-15", // Demokrasi ve Millî Birlik Günü
            "08-30", // Zafer Bayramı
            "10-29"  // Cumhuriyet Bayramı
    );
    public static LocalDate lastCompletedTradingDay(LocalDate today) {
        LocalDate date = today.minusDays(1);
        while (isHoliday(date)) {
            date = date.minusDays(1);
        }
        return date;
    }



    public static boolean isHoliday(LocalDate date) {
        // Hafta sonu kontrolü
        if (date.getDayOfWeek() == DayOfWeek.SATURDAY
                || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return true;
        }

        // Sabit milli tatil kontrolü
        String monthDay = String.format("%02d-%02d", date.getMonthValue(), date.getDayOfMonth());
        if (FIXED_HOLIDAYS.contains(monthDay)) {
            return true;
        }

        // Dini tatil kontrolü
        return isReligiousHoliday(date);
    }

    public static boolean isTradingDay(LocalDate date) {
        return !isHoliday(date);
    }
    @Deprecated
    public static LocalDate lastTradingDay(LocalDate from) {
        LocalDate date = from;
        while (isHoliday(date)) {
            date = date.minusDays(1);
        }
        return date;
    }
    public static long countTradingDays(LocalDate start, LocalDate end) {
        long count = 0;
        LocalDate date = start;
        while (!date.isAfter(end)) {
            if (isTradingDay(date)) count++;
            date = date.plusDays(1);
        }
        return count;
    }
    private static boolean isReligiousHoliday(LocalDate date) {
        try {
            Set<LocalDate> religiousHolidays = getReligiousHolidays(date.getYear());
            return religiousHolidays.contains(date);
        } catch (Exception e) {
            return false;
        }
    }

    private static Set<LocalDate> getReligiousHolidays(int year) throws Exception {
        Set<LocalDate> holidays = new HashSet<>();

        // Hicri yılı bul (yaklaşık)
        UmmalquraCalendar cal = new UmmalquraCalendar();
        cal.set(UmmalquraCalendar.YEAR, year);

        // Ramazan Bayramı — Şevval 1, 2, 3 + arife (Ramazan 29)
        addHijriDate(holidays, year, 10, 1);  // Şevval 1
        addHijriDate(holidays, year, 10, 2);  // Şevval 2
        addHijriDate(holidays, year, 10, 3);  // Şevval 3
        addHijriDate(holidays, year, 9, 29);  // Ramazan Bayramı arifesi

        // Kurban Bayramı — Zilhicce 10, 11, 12, 13 + arife (Zilhicce 9)
        addHijriDate(holidays, year, 12, 9);  // Kurban Bayramı arifesi
        addHijriDate(holidays, year, 12, 10); // Zilhicce 10
        addHijriDate(holidays, year, 12, 11); // Zilhicce 11
        addHijriDate(holidays, year, 12, 12); // Zilhicce 12
        addHijriDate(holidays, year, 12, 13); // Zilhicce 13

        return holidays;
    }

    private static void addHijriDate(Set<LocalDate> holidays, int gregorianYear,
                                     int hijriMonth, int hijriDay) throws Exception {
        UmmalquraCalendar cal = new UmmalquraCalendar();

        // Gregoryen yılına yakın Hicri yılı hesapla
        int hijriYear = gregorianYear - 579;

        cal.set(hijriYear, hijriMonth - 1, hijriDay);

        LocalDate date = LocalDate.of(
                cal.get(UmmalquraCalendar.YEAR),
                cal.get(UmmalquraCalendar.MONTH) + 1,
                cal.get(UmmalquraCalendar.DAY_OF_MONTH)
        );

        // Yıl kayması olabilir, sadece hedef yıla ait tarihleri ekle
        if (date.getYear() == gregorianYear) {
            holidays.add(date);
        }
    }
}