package com.alper.backend.market.fund.service;

import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TefasBackfillService")
class TefasBackfillServiceTest {

    private static final TefasFetchResult NON_EMPTY_RESULT = new TefasFetchResult(1, 1, 1, 1);
    private static final TefasFetchResult EMPTY_RESULT = new TefasFetchResult(0, 0, 0, 0);

    @Mock private TefasService tefasService;
    @Mock private FundRepository fundRepository;
    @Mock private FundPriceRepository fundPriceRepository;
    @Mock private FundAllocationRepository fundAllocationRepository;

    @InjectMocks private TefasBackfillService service;

    private Fund createFund(Long id, String code) {
        return Fund.builder()
                .id(id)
                .code(code)
                .build();
    }

    @Test
    @DisplayName("DB'de fon yoksa işlem yapmadan çıkar")
    void skipsWhenNoFundsFound() {
        when(fundRepository.findAll()).thenReturn(Collections.emptyList());

        service.backfillIfEmpty();

        verifyNoInteractions(tefasService);
        verifyNoInteractions(fundPriceRepository);
        verifyNoInteractions(fundAllocationRepository);
    }

    @Test
    @DisplayName("Fonun Price veya Allocation verisinden biri eksikse baştan backfill yapar ve aylık chunk'lara böler")
    void executesBackfillWithChunksWhenHistoryMissing() {
        Fund fund = createFund(1L, "MAC");
        when(fundRepository.findAll()).thenReturn(List.of(fund));

        // Price var, Allocation yok -> Biri eksik olduğu için Optional.empty() döner ve baştan başlar (365 gün)
        when(fundPriceRepository.findTopByFundIdOrderByPriceDateDesc(1L))
                .thenReturn(Optional.of(FundPrice.builder().priceDate(LocalDate.now()).build()));
        when(fundAllocationRepository.findTopByFundIdOrderByAllocationDateDesc(1L))
                .thenReturn(Optional.empty());
        when(tefasService.fetchAndSaveForDate(eq("MAC"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(NON_EMPTY_RESULT);

        service.backfillIfEmpty();

        // 365 günlük süre ay bazlı chunk'lara bölünür.
        verify(tefasService, atLeast(12)).fetchAndSaveForDate(eq("MAC"), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    @DisplayName("En son tarih bulunurken Price ve Allocation tarihlerinden daha eski olanı (geride kalanı) baz alır")
    void usesOlderDateBetweenPriceAndAllocation() {
        Fund fund = createFund(1L, "YAS");
        when(fundRepository.findAll()).thenReturn(List.of(fund));

        // Price = 10 gün önce
        FundPrice price = FundPrice.builder().priceDate(LocalDate.now().minusDays(10)).build();
        when(fundPriceRepository.findTopByFundIdOrderByPriceDateDesc(1L)).thenReturn(Optional.of(price));

        // Allocation = 5 gün önce
        FundAllocation alloc = FundAllocation.builder().allocationDate(LocalDate.now().minusDays(5)).build();
        when(fundAllocationRepository.findTopByFundIdOrderByAllocationDateDesc(1L)).thenReturn(Optional.of(alloc));

        // DİKKAT: Burada countBy... stub'ını KALDIRDIK. Çünkü veri güncel olmadığı için
        // AbstractBackfillService direkt backfill başlatır ve gap kontrolüne (count) girmez.
        when(tefasService.fetchAndSaveForDate(eq("YAS"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(NON_EMPTY_RESULT);

        service.backfillIfEmpty();

        ArgumentCaptor<LocalDate> endCaptor = ArgumentCaptor.forClass(LocalDate.class);
        verify(tefasService, atLeastOnce()).fetchAndSaveForDate(eq("YAS"), any(), endCaptor.capture());

        // Ters backfill önce son tamamlanmış işlem gününden başlar.
        assertThat(endCaptor.getAllValues().get(0))
                .isEqualTo(com.alper.backend.market.common.TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now()));
    }

    @Test
    @DisplayName("Veri güncel ve gap yoksa tefasService çağrılmaz")
    void skipsBackfillWhenUpToDateAndNoGap() {
        Fund fund = createFund(1L, "AFT");
        when(fundRepository.findAll()).thenReturn(List.of(fund));

        FundPrice price = FundPrice.builder().priceDate(LocalDate.now()).build();
        when(fundPriceRepository.findTopByFundIdOrderByPriceDateDesc(1L)).thenReturn(Optional.of(price));

        FundAllocation alloc = FundAllocation.builder().allocationDate(LocalDate.now()).build();
        when(fundAllocationRepository.findTopByFundIdOrderByAllocationDateDesc(1L)).thenReturn(Optional.of(alloc));

        when(fundPriceRepository.countByFundIdAndPriceDateBetween(eq(1L), any(), any())).thenReturn(999L);

        service.backfillIfEmpty();

        verifyNoInteractions(tefasService);
    }

    @Test
    @DisplayName("Bir chunk API'den hata alsa bile döngü kırılmaz, sonraki chunk'lar için devam eder")
    void continuesLoopOnChunkError() {
        Fund fund = createFund(1L, "KUT");
        when(fundRepository.findAll()).thenReturn(List.of(fund));

        // Baştan başlat (365 gün -> birden fazla chunk)
        when(fundPriceRepository.findTopByFundIdOrderByPriceDateDesc(1L)).thenReturn(Optional.empty());
        when(fundAllocationRepository.findTopByFundIdOrderByAllocationDateDesc(1L)).thenReturn(Optional.empty());

        // İlk çağrıda hata fırlat, sonraki chunk'lar dolu dönsün.
        when(tefasService.fetchAndSaveForDate(anyString(), any(LocalDate.class), any(LocalDate.class)))
                .thenThrow(new RuntimeException("TEFAS WAF BLOCK"))
                .thenReturn(NON_EMPTY_RESULT);

        service.backfillIfEmpty();

        // Hata alınmasına rağmen diğer chunk'lar denenmiş olmalı (> 1)
        verify(tefasService, atLeast(2)).fetchAndSaveForDate(eq("KUT"), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    @DisplayName("Backfill tarih aralığını ay sınırlarına hizalı chunk'lara böler")
    void splitsBackfillRangeIntoCalendarMonthAlignedChunks() {
        Fund fund = createFund(1L, "MAC");
        when(tefasService.fetchAndSaveForDate(eq("MAC"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(NON_EMPTY_RESULT);

        service.fetchAndSave(fund, "15-04-2026", "08-05-2026");

        verify(tefasService).fetchAndSaveForDate(
                eq("MAC"), eq(LocalDate.of(2026, 5, 1)), eq(LocalDate.of(2026, 5, 8)));
        verify(tefasService).fetchAndSaveForDate(
                eq("MAC"), eq(LocalDate.of(2026, 4, 15)), eq(LocalDate.of(2026, 4, 30)));
    }

    @Test
    @DisplayName("Boş ay görüldüğünde aynı fon için daha eski aylara istek atmaz")
    void stopsBackfillForFundWhenEmptyMonthIsReturned() {
        Fund fund = createFund(1L, "MAC");
        when(tefasService.fetchAndSaveForDate(eq("MAC"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(NON_EMPTY_RESULT)
                .thenReturn(EMPTY_RESULT)
                .thenReturn(NON_EMPTY_RESULT);

        service.fetchAndSave(fund, "01-03-2026", "08-05-2026");

        verify(tefasService).fetchAndSaveForDate(
                eq("MAC"), eq(LocalDate.of(2026, 5, 1)), eq(LocalDate.of(2026, 5, 8)));
        verify(tefasService).fetchAndSaveForDate(
                eq("MAC"), eq(LocalDate.of(2026, 4, 1)), eq(LocalDate.of(2026, 4, 30)));
        verify(tefasService, never()).fetchAndSaveForDate(
                eq("MAC"), eq(LocalDate.of(2026, 3, 1)), eq(LocalDate.of(2026, 3, 31)));
    }
}
