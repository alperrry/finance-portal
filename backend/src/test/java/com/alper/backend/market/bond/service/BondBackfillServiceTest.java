package com.alper.backend.market.bond.service;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BondBackfillService")
class BondBackfillServiceTest {

    @Mock private EvdsService evdsService;
    @Mock private BondRepository bondRepository;
    @Mock private BondRateHistoryRepository bondRateHistoryRepository;

    @InjectMocks private BondBackfillService service;

    private Bond createBond(Long id, String seriesCode) {
        return Bond.builder()
                .id(id)
                .evdsSeriesCode(seriesCode)
                .build();
    }

    @Test
    @DisplayName("DB'de bond yoksa işlem yapmadan çıkar")
    void skipsWhenNoBondsFound() {
        when(bondRepository.findAll()).thenReturn(Collections.emptyList());

        service.backfillIfEmpty();

        verifyNoInteractions(evdsService);
        verifyNoInteractions(bondRateHistoryRepository);
    }

    @Test
    @DisplayName("Bond'un hiç geçmiş verisi yoksa (ilk kurulum) backfill başlar")
    void executesBackfillWhenNoHistoryExists() {
        Bond bond = createBond(1L, "TP.DK.USD.A");
        when(bondRepository.findAll()).thenReturn(List.of(bond));

        // Hiç kayıt yok
        when(bondRateHistoryRepository.findTopByBondIdOrderByRateDateDesc(1L))
                .thenReturn(Optional.empty());

        service.backfillIfEmpty();

        // fetchAndSave çağrılmalı
        verify(evdsService).fetchAndSave(eq("TP.DK.USD.A"), anyString(), anyString());
    }

    @Test
    @DisplayName("Veri güncel ancak gap varsa backfill çalışır")
    void executesBackfillWhenFreshButHasGap() {
        Bond bond = createBond(1L, "TP.DK.USD.A");
        when(bondRepository.findAll()).thenReturn(List.of(bond));

        BondRateHistory history = BondRateHistory.builder().rateDate(LocalDate.now()).build();
        when(bondRateHistoryRepository.findTopByBondIdOrderByRateDateDesc(1L))
                .thenReturn(Optional.of(history));

        // Gap var: beklenen (countExistingRecords) 0 dönüyor
        when(bondRateHistoryRepository.countByBondIdAndRateDateBetween(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(0L);

        service.backfillIfEmpty();

        verify(evdsService).fetchAndSave(eq("TP.DK.USD.A"), anyString(), anyString());
    }

    @Test
    @DisplayName("Veri güncel ve gap yoksa backfill atlanır")
    void skipsBackfillWhenUpToDateAndNoGap() {
        Bond bond = createBond(1L, "TP.DK.USD.A");
        when(bondRepository.findAll()).thenReturn(List.of(bond));

        BondRateHistory history = BondRateHistory.builder().rateDate(LocalDate.now()).build();
        when(bondRateHistoryRepository.findTopByBondIdOrderByRateDateDesc(1L))
                .thenReturn(Optional.of(history));

        // Gap yok: Çok sayıda veri dönüyor
        when(bondRateHistoryRepository.countByBondIdAndRateDateBetween(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(999L);

        service.backfillIfEmpty();

        verifyNoInteractions(evdsService);
    }

    @Test
    @DisplayName("Bir bond için dış servis hata atsa bile diğer bond'lar için döngü devam eder")
    void continuesLoopOnExternalServiceError() {
        Bond bond1 = createBond(1L, "SERIES.1");
        Bond bond2 = createBond(2L, "SERIES.2");
        when(bondRepository.findAll()).thenReturn(List.of(bond1, bond2));

        // İkisi için de tarih eksik olsun ki fetchAndSave tetiklensin
        when(bondRateHistoryRepository.findTopByBondIdOrderByRateDateDesc(anyLong()))
                .thenReturn(Optional.empty());

        // İlk bond için hata fırlat
        doThrow(new RuntimeException("API DOWN"))
                .when(evdsService).fetchAndSave(eq("SERIES.1"), anyString(), anyString());

        service.backfillIfEmpty();

        // Hata fırlatılmasına rağmen 2. bond için de fetchAndSave denenmiş olmalı
        verify(evdsService).fetchAndSave(eq("SERIES.1"), anyString(), anyString());
        verify(evdsService).fetchAndSave(eq("SERIES.2"), anyString(), anyString());
    }
}
