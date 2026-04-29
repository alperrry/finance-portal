package com.alper.backend.market.fx.service;

import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TcmbBackfillService")
class TcmbBackfillServiceTest {

    @Mock private TcmbService tcmbService;
    @Mock private ExchangeRateRepository exchangeRateRepository;

    @InjectMocks private TcmbBackfillService service;

    @BeforeEach
    void setUp() {
        // @Value anotasyonlu alanları Reflection ile eziyoruz
        ReflectionTestUtils.setField(service, "retentionDays", 5);
        ReflectionTestUtils.setField(service, "archiveUrl", "http://tcmb.gov.tr/kurlar/%s/%s.xml");
    }

    @Test
    @DisplayName("Veri güncel ve gap yoksa backfill atlanır")
    void skipsBackfillWhenUpToDateAndNoGap() {
        // Freshness (güncellik) kontrolü: Son gün verisi var
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate(eq("USD"), any(LocalDate.class)))
                .thenReturn(Optional.of(new ExchangeRate()));

        // Gap kontrolü: Beklenen sayıdan fazla veya eşit kayıt var
        when(exchangeRateRepository.countByCurrencyCodeAndRateDateBetween(eq("USD"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(999L); // Yüksek bir sayı verip gap yok diyoruz

        service.backfillIfNeeded();

        // Dış API kesinlikle çağrılmamalı
        verifyNoInteractions(tcmbService);
    }

    @Test
    @DisplayName("Veri güncel ama arada gap (eksik gün) varsa backfill çalışır")
    void executesBackfillWhenFreshButHasGap() {
        // İlk çağrı (freshness check) için dolu dön, loop içindeki tarihler için boş dön
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate(eq("USD"), any(LocalDate.class)))
                .thenReturn(Optional.of(new ExchangeRate())) // Freshness: OK
                .thenReturn(Optional.empty());               // Loop içi: BULUNAMADI -> API'ye git

        // Gap kontrolü: Hiç kayıt yok (0), dolayısıyla gap var
        when(exchangeRateRepository.countByCurrencyCodeAndRateDateBetween(eq("USD"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(0L);

        service.backfillIfNeeded();

        // En az 1 kere dış API çağrılmış olmalı (tatil günleri haricindeki iş günleri için)
        verify(tcmbService, atLeastOnce()).fetchAndSaveForDate(anyString(), any(LocalDate.class));
    }

    @Test
    @DisplayName("Veri hiç güncel değilse gap kontrolü atlanıp direkt backfill başlar")
    void executesBackfillWhenNotFresh() {
        // Freshness: YOK (Son gün verisi eksik)
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate(eq("USD"), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        service.backfillIfNeeded();

        // countBy... metodu HİÇ çağrılmamalı çünkü güncel değilse gap kontrolüne girmeden backfill başlar
        verify(exchangeRateRepository, never()).countByCurrencyCodeAndRateDateBetween(any(), any(), any());

        // Dış API tetiklenmiş olmalı
        verify(tcmbService, atLeastOnce()).fetchAndSaveForDate(anyString(), any(LocalDate.class));
    }

    @Test
    @DisplayName("Dış API hata fırlatsa bile döngü (loop) kırılmaz, diğer günlere devam eder")
    void continuesLoopOnExternalServiceError() {
        // Freshness ve loop içi hep boş dönsün
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate(eq("USD"), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        // Dış servis İLK çağrıda Exception atsın
        doThrow(new RuntimeException("API DOWN"))
                .when(tcmbService).fetchAndSaveForDate(anyString(), any(LocalDate.class));

        // Metot patlamamalı (try-catch sarmalaması çalışmalı)
        service.backfillIfNeeded();

        // Hata fırlatmasına rağmen döngü iş günleri kadar (atLeastOnce) denemiş olmalı
        verify(tcmbService, atLeastOnce()).fetchAndSaveForDate(anyString(), any(LocalDate.class));
    }
}
