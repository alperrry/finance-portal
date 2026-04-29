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
    @DisplayName("Fonun Price veya Allocation verisinden biri eksikse baştan backfill yapar ve 89 günlük chunk'lara böler")
    void executesBackfillWithChunksWhenHistoryMissing() {
        Fund fund = createFund(1L, "MAC");
        when(fundRepository.findAll()).thenReturn(List.of(fund));

        // Price var, Allocation yok -> Biri eksik olduğu için Optional.empty() döner ve baştan başlar (365 gün)
        when(fundPriceRepository.findTopByFundIdOrderByPriceDateDesc(1L))
                .thenReturn(Optional.of(FundPrice.builder().priceDate(LocalDate.now()).build()));
        when(fundAllocationRepository.findTopByFundIdOrderByAllocationDateDesc(1L))
                .thenReturn(Optional.empty());

        service.backfillIfEmpty();

        // 365 günlük süre için max 89 günlük chunk'lar atılacağı için en az 4 çağrı (chunk) yapılmalı
        verify(tefasService, atLeast(4)).fetchAndSaveForDate(eq("MAC"), any(LocalDate.class), any(LocalDate.class));
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

        service.backfillIfEmpty();

        ArgumentCaptor<LocalDate> startCaptor = ArgumentCaptor.forClass(LocalDate.class);
        verify(tefasService, atLeastOnce()).fetchAndSaveForDate(eq("YAS"), startCaptor.capture(), any());

        // Daha eski olan 10 gün öncesiydi. AbstractBackfillService en son tarihe +1 gün ekleyerek başlar.
        // Yani backfill LocalDate.now().minusDays(9) tarihinden başlamalı.
        LocalDate expectedStart = LocalDate.now().minusDays(9);
        assertThat(startCaptor.getAllValues().get(0)).isEqualTo(expectedStart);
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

        // İlk çağrıda hata fırlat
        doThrow(new RuntimeException("TEFAS WAF BLOCK"))
                .doNothing()
                .when(tefasService).fetchAndSaveForDate(anyString(), any(LocalDate.class), any(LocalDate.class));

        service.backfillIfEmpty();

        // Hata alınmasına rağmen diğer chunk'lar denenmiş olmalı (> 1)
        verify(tefasService, atLeast(2)).fetchAndSaveForDate(eq("KUT"), any(LocalDate.class), any(LocalDate.class));
    }
}
