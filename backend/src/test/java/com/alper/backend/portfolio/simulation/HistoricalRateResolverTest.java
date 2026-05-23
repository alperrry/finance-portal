package com.alper.backend.portfolio.simulation;

import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.portfolio.simulation.exception.HistoricalDataMissingException;
import com.alper.backend.portfolio.simulation.service.HistoricalRateResolver;
import com.alper.backend.portfolio.simulation.service.RateDirection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("HistoricalRateResolver")
class HistoricalRateResolverTest {

    @Mock private ExchangeRateRepository exchangeRateRepository;

    // Direct instantiation — @Cacheable proxy is bypassed intentionally in unit tests.
    private HistoricalRateResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new HistoricalRateResolver(exchangeRateRepository);
    }

    private ExchangeRate rate(BigDecimal buying, BigDecimal selling) {
        return ExchangeRate.builder()
                .currencyCode("USD")
                .currencyName("ABD Doları")
                .unit(1)
                .forexBuying(buying)
                .forexSelling(selling)
                .rateDate(LocalDate.of(2026, 1, 15))
                .source("TCMB")
                .build();
    }

    @Test
    @DisplayName("Tam tarihte kur bulunur — forexSelling döner")
    void exactDateSellingRate() {
        LocalDate date = LocalDate.of(2026, 1, 15); // Wednesday
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate("USD", date))
                .thenReturn(Optional.of(rate(new BigDecimal("32.50"), new BigDecimal("32.80"))));

        BigDecimal result = resolver.resolve("USD", date, RateDirection.SELLING);

        assertThat(result).isEqualByComparingTo(new BigDecimal("32.80"));
    }

    @Test
    @DisplayName("Tam tarihte kur bulunur — forexBuying döner")
    void exactDateBuyingRate() {
        LocalDate date = LocalDate.of(2026, 1, 15); // Wednesday
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate("USD", date))
                .thenReturn(Optional.of(rate(new BigDecimal("32.50"), new BigDecimal("32.80"))));

        BigDecimal result = resolver.resolve("USD", date, RateDirection.BUYING);

        assertThat(result).isEqualByComparingTo(new BigDecimal("32.50"));
    }

    @Test
    @DisplayName("Cumartesi sorgusu → Cuma kurunu döner")
    void saturdayFallsBackToFriday() {
        LocalDate saturday = LocalDate.of(2026, 1, 17); // Saturday
        LocalDate friday   = LocalDate.of(2026, 1, 16); // Friday

        // Saturday: isTradingDay = false → skipped, no repo call needed
        // Friday:
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate("USD", friday))
                .thenReturn(Optional.of(rate(new BigDecimal("32.40"), new BigDecimal("32.70"))));

        BigDecimal result = resolver.resolve("USD", saturday, RateDirection.SELLING);

        assertThat(result).isEqualByComparingTo(new BigDecimal("32.70"));
        verify(exchangeRateRepository, never()).findByCurrencyCodeAndRateDate("USD", saturday);
        verify(exchangeRateRepository).findByCurrencyCodeAndRateDate("USD", friday);
    }

    @Test
    @DisplayName("Pazar sorgusu → Cuma kurunu döner")
    void sundayFallsBackToFriday() {
        LocalDate sunday = LocalDate.of(2026, 1, 18); // Sunday
        LocalDate friday = LocalDate.of(2026, 1, 16); // Friday

        when(exchangeRateRepository.findByCurrencyCodeAndRateDate("USD", friday))
                .thenReturn(Optional.of(rate(new BigDecimal("32.40"), new BigDecimal("32.70"))));

        BigDecimal result = resolver.resolve("USD", sunday, RateDirection.SELLING);

        assertThat(result).isEqualByComparingTo(new BigDecimal("32.70"));
        verify(exchangeRateRepository, never()).findByCurrencyCodeAndRateDate("USD", sunday);
        verify(exchangeRateRepository, never()).findByCurrencyCodeAndRateDate("USD",
                LocalDate.of(2026, 1, 17));
        verify(exchangeRateRepository).findByCurrencyCodeAndRateDate("USD", friday);
    }

    @Test
    @DisplayName("7 gün geriye gidilmesi halinde HistoricalDataMissingException fırlatılır")
    void exhaustion_throwsHistoricalDataMissing() {
        LocalDate date = LocalDate.of(2026, 1, 15); // Wednesday — trading day
        // No rate for this or prior 7 days
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate(eq("USD"), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> resolver.resolve("USD", date, RateDirection.SELLING))
                .isInstanceOf(HistoricalDataMissingException.class)
                .satisfies(ex -> {
                    HistoricalDataMissingException hdme = (HistoricalDataMissingException) ex;
                    assertThat(hdme.getCurrency()).isEqualTo("USD");
                    assertThat(hdme.getDate()).isEqualTo(date);
                    assertThat(hdme.getDirection()).isEqualTo(RateDirection.SELLING);
                });
    }

    @Test
    @DisplayName("forexSelling null ise atlanır, önceki güne geçilir")
    void nullForexSelling_skipsToNextDay() {
        LocalDate thursday = LocalDate.of(2026, 1, 15); // trading day
        LocalDate wednesday = LocalDate.of(2026, 1, 14); // trading day

        ExchangeRate rateWithNullSelling = ExchangeRate.builder()
                .currencyCode("USD")
                .currencyName("ABD Doları")
                .unit(1)
                .forexBuying(new BigDecimal("32.50"))
                .forexSelling(null) // null — should skip
                .rateDate(thursday)
                .source("TCMB")
                .build();

        when(exchangeRateRepository.findByCurrencyCodeAndRateDate("USD", thursday))
                .thenReturn(Optional.of(rateWithNullSelling));
        when(exchangeRateRepository.findByCurrencyCodeAndRateDate("USD", wednesday))
                .thenReturn(Optional.of(rate(new BigDecimal("32.00"), new BigDecimal("32.30"))));

        BigDecimal result = resolver.resolve("USD", thursday, RateDirection.SELLING);

        assertThat(result).isEqualByComparingTo(new BigDecimal("32.30"));
    }
}
