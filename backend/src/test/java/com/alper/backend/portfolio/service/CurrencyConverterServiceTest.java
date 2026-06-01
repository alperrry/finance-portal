package com.alper.backend.portfolio.service;

import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CurrencyConverterService Testleri")
class CurrencyConverterServiceTest {

    @Mock private ExchangeRateRepository exchangeRateRepository;

    private CurrencyConverterService service;

    @BeforeEach
    void setUp() {
        service = new CurrencyConverterService(exchangeRateRepository);
    }

    private ExchangeRate buildRate(String code, String buying) {
        return ExchangeRate.builder()
                .currencyCode(code)
                .currencyName(code)
                .forexBuying(new BigDecimal(buying))
                .unit(1)
                .source("TCMB")
                .build();
    }

    @Nested
    @DisplayName("Aynı Para Birimi")
    class SameCurrency {

        @Test
        @DisplayName("Aynı birimden aynı birime dönüşümde orijinal tutar döner")
        void convert_sameCurrency_returnsOriginalAmount() {
            Optional<BigDecimal> result = service.convert(new BigDecimal("100"), "USD", "USD");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("100");
        }

        @Test
        @DisplayName("TRY'den TRY'ye dönüşüm orijinal tutarı döner")
        void convert_tryToTry_returnsOriginalAmount() {
            Optional<BigDecimal> result = service.convert(new BigDecimal("500"), "TRY", "TRY");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("500");
        }
    }

    @Nested
    @DisplayName("TRY Baz Dönüşümler")
    class TryBasedConversions {

        @Test
        @DisplayName("USD → TRY: kur ile çarpılır")
        void convert_fromUsdToTry_multipliesByRate() {
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("USD"))
                    .thenReturn(Optional.of(buildRate("USD", "35.00")));

            Optional<BigDecimal> result = service.convert(new BigDecimal("10"), "USD", "TRY");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("350.0000");
        }

        @Test
        @DisplayName("TRY → USD: kura bölünür")
        void convert_fromTryToUsd_dividesByRate() {
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("USD"))
                    .thenReturn(Optional.of(buildRate("USD", "35.00")));

            Optional<BigDecimal> result = service.convert(new BigDecimal("350"), "TRY", "USD");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("10.0000");
        }
    }

    @Nested
    @DisplayName("Cross-Rate Dönüşümler")
    class CrossRateConversions {

        @Test
        @DisplayName("USD → EUR: TRY üzerinden cross-rate hesaplanır")
        void convert_usdToEur_convertsViaTry() {
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("USD"))
                    .thenReturn(Optional.of(buildRate("USD", "35.00")));
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("EUR"))
                    .thenReturn(Optional.of(buildRate("EUR", "38.50")));

            Optional<BigDecimal> result = service.convert(new BigDecimal("1"), "USD", "EUR");

            // 1 USD = 35 TRY; 35 / 38.50 = 0.9091 EUR
            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("0.9091");
        }

        @Test
        @DisplayName("Cross-rate: kaynak kur bulunamazsa boş döner")
        void convert_crossRate_whenFromRateNotFound_returnsEmpty() {
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("GBP"))
                    .thenReturn(Optional.empty());
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("EUR"))
                    .thenReturn(Optional.of(buildRate("EUR", "38.50")));

            Optional<BigDecimal> result = service.convert(new BigDecimal("100"), "GBP", "EUR");

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("Hata Senaryoları")
    class ErrorCases {

        @Test
        @DisplayName("Kur bulunamazsa boş döner")
        void convert_whenRateNotFound_returnsEmpty() {
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("JPY"))
                    .thenReturn(Optional.empty());

            Optional<BigDecimal> result = service.convert(new BigDecimal("100"), "JPY", "TRY");

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Kur sıfırsa boş döner")
        void convert_whenRateIsZero_returnsEmpty() {
            when(exchangeRateRepository.findFirstByCurrencyCodeOrderByRateDateDesc("USD"))
                    .thenReturn(Optional.of(buildRate("USD", "0")));

            Optional<BigDecimal> result = service.convert(new BigDecimal("100"), "USD", "TRY");

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Tutar null ise boş döner")
        void convert_whenAmountIsNull_returnsEmpty() {
            Optional<BigDecimal> result = service.convert(null, "USD", "TRY");

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Para birimi null ise boş döner")
        void convert_whenCurrencyIsNull_returnsEmpty() {
            Optional<BigDecimal> result = service.convert(new BigDecimal("100"), null, "TRY");

            assertThat(result).isEmpty();
        }
    }
}
