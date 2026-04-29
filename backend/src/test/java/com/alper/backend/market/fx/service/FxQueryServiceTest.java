package com.alper.backend.market.fx.service;

import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.fx.dto.FxResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("FxQueryService")
class FxQueryServiceTest {

    @Mock private ExchangeRateRepository repository;
    private FxQueryService service;

    @BeforeEach
    void setUp() {
        service = new FxQueryService(repository);
    }

    private ExchangeRate fx(String code, String name, int unit, String buying, String selling, LocalDate date) {
        return ExchangeRate.builder()
                .currencyCode(code)
                .currencyName(name)
                .unit(unit)
                .forexBuying(buying == null ? null : new BigDecimal(buying))
                .forexSelling(selling == null ? null : new BigDecimal(selling))
                .rateDate(date)
                .source("TCMB")
                .build();
    }

    @Test
    @DisplayName("Birden fazla currency'nin en son kuru DTO listesine dönüşür")
    void multipleCurrenciesMapToResponseList() {
        LocalDate date = LocalDate.of(2026, 4, 24);
        when(repository.findLatestRates()).thenReturn(List.of(
                fx("USD", "US DOLLAR", 1, "32.4850", "32.5430", date),
                fx("EUR", "EURO",      1, "35.1240", "35.2010", date),
                fx("JPY", "JAPON YENI", 100, "21.4520", "21.5610", date)
        ));

        List<FxResponse> result = service.getAll();

        assertThat(result).hasSize(3);
        FxResponse usd = result.get(0);
        assertThat(usd.getCurrencyCode()).isEqualTo("USD");
        assertThat(usd.getCurrencyName()).isEqualTo("US DOLLAR");
        assertThat(usd.getUnit()).isEqualTo(1);
        assertThat(usd.getForexBuying()).isEqualByComparingTo("32.4850");
        assertThat(usd.getForexSelling()).isEqualByComparingTo("32.5430");
        assertThat(usd.getRateDate()).isEqualTo(date);

        // JPY unit=100 doğru taşındı mı
        FxResponse jpy = result.get(2);
        assertThat(jpy.getUnit()).isEqualTo(100);
    }

    @Test
    @DisplayName("Boş repository sonucu için boş liste döner")
    void emptyRepositoryReturnsEmptyList() {
        when(repository.findLatestRates()).thenReturn(Collections.emptyList());

        List<FxResponse> result = service.getAll();

        assertThat(result).isNotNull().isEmpty();
    }

    @Test
    @DisplayName("Forex buying null olan currency (XDR gibi) tolere edilir")
    void nullForexBuyingIsTolerated() {
        when(repository.findLatestRates()).thenReturn(List.of(
                fx("XDR", "OZEL CEKME HAKKI", 1, null, "44.20", LocalDate.of(2026, 4, 24))
        ));

        List<FxResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getForexBuying()).isNull();
        assertThat(result.get(0).getForexSelling()).isEqualByComparingTo("44.20");
    }

    @Test
    @DisplayName("Repository'nin döndürdüğü sıra response'ta korunur")
    void repositoryOrderIsPreserved() {
        LocalDate date = LocalDate.of(2026, 4, 24);
        when(repository.findLatestRates()).thenReturn(List.of(
                fx("EUR", "EURO",      1, "35.12", "35.20", date),
                fx("AUD", "AVUSTRALYA", 1, "21.10", "21.20", date),
                fx("USD", "US DOLLAR",  1, "32.48", "32.54", date)
        ));

        List<FxResponse> result = service.getAll();

        assertThat(result).extracting(FxResponse::getCurrencyCode)
                .containsExactly("EUR", "AUD", "USD");
    }

    @Test
    @DisplayName("Tek currency başarıyla dönüşür")
    void singleCurrencyMapsCorrectly() {
        when(repository.findLatestRates()).thenReturn(List.of(
                fx("GBP", "STERLIN", 1, "40.10", "40.25", LocalDate.of(2026, 4, 24))
        ));

        List<FxResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCurrencyCode()).isEqualTo("GBP");
    }
}
