package com.alper.backend.market.fund.service;

import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.dto.FundResponse;
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
@DisplayName("FundQueryService")
class FundQueryServiceTest {

    @Mock private FundPriceRepository repository;
    private FundQueryService service;

    @BeforeEach
    void setUp() {
        service = new FundQueryService(repository);
    }

    private Fund fund(String code, String name, String type) {
        return Fund.builder()
                .id(1L)
                .code(code)
                .name(name)
                .fundType(type)
                .build();
    }

    private FundPrice price(Fund f, LocalDate date, String price, String shares,
                             Integer investors, String portfolioSize) {
        return FundPrice.builder()
                .fund(f)
                .priceDate(date)
                .price(new BigDecimal(price))
                .totalShares(shares == null ? null : new BigDecimal(shares))
                .investorCount(investors)
                .portfolioSize(portfolioSize == null ? null : new BigDecimal(portfolioSize))
                .build();
    }

    @Test
    @DisplayName("Birden fazla fund'un en son fiyatı DTO listesine dönüşür")
    void multipleFundsMapToResponseList() {
        Fund mac = fund("MAC", "Test Fonu A", "YAT");
        Fund tit = fund("TIT", "Test Fonu B", "YAT");

        when(repository.findLatestPrices()).thenReturn(List.of(
                price(mac, LocalDate.of(2026, 4, 24), "12.345678", "1000000.00", 1500, "1234567890.50"),
                price(tit, LocalDate.of(2026, 4, 24), "5.250000",  "500000.00",   800, "456789012.30")
        ));

        List<FundResponse> result = service.getAll();

        assertThat(result).hasSize(2);
        FundResponse first = result.get(0);
        assertThat(first.getCode()).isEqualTo("MAC");
        assertThat(first.getName()).isEqualTo("Test Fonu A");
        assertThat(first.getFundType()).isEqualTo("YAT");
        assertThat(first.getPrice()).isEqualByComparingTo("12.345678");
        assertThat(first.getTotalShares()).isEqualByComparingTo("1000000.00");
        assertThat(first.getInvestorCount()).isEqualTo(1500);
        assertThat(first.getPortfolioSize()).isEqualByComparingTo("1234567890.50");
        assertThat(first.getPriceDate()).isEqualTo(LocalDate.of(2026, 4, 24));
    }

    @Test
    @DisplayName("Boş repository sonucu için boş liste döner")
    void emptyRepositoryReturnsEmptyList() {
        when(repository.findLatestPrices()).thenReturn(Collections.emptyList());

        List<FundResponse> result = service.getAll();

        assertThat(result).isNotNull().isEmpty();
    }

    @Test
    @DisplayName("Optional alanlar (totalShares, investorCount, portfolioSize) null olabilir")
    void optionalFieldsCanBeNull() {
        Fund f = fund("X", "Test", "YAT");
        when(repository.findLatestPrices()).thenReturn(List.of(
                price(f, LocalDate.of(2026, 4, 24), "10.0", null, null, null)
        ));

        List<FundResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPrice()).isEqualByComparingTo("10.0");
        assertThat(result.get(0).getTotalShares()).isNull();
        assertThat(result.get(0).getInvestorCount()).isNull();
        assertThat(result.get(0).getPortfolioSize()).isNull();
    }

    @Test
    @DisplayName("Repository sırası response'ta korunur")
    void repositoryOrderIsPreserved() {
        Fund f1 = fund("AAA", "A Fonu", "YAT");
        Fund f2 = fund("BBB", "B Fonu", "YAT");
        Fund f3 = fund("CCC", "C Fonu", "YAT");

        when(repository.findLatestPrices()).thenReturn(List.of(
                price(f3, LocalDate.of(2026, 4, 24), "1", null, null, null),
                price(f1, LocalDate.of(2026, 4, 24), "2", null, null, null),
                price(f2, LocalDate.of(2026, 4, 24), "3", null, null, null)
        ));

        List<FundResponse> result = service.getAll();

        assertThat(result).extracting(FundResponse::getCode)
                .containsExactly("CCC", "AAA", "BBB");
    }

    @Test
    @DisplayName("Tek fund başarıyla dönüşür")
    void singleFundMapsCorrectly() {
        Fund f = fund("MAC", "Test", "YAT");
        when(repository.findLatestPrices()).thenReturn(List.of(
                price(f, LocalDate.of(2026, 4, 24), "12.34", "1000", 100, "12340.00")
        ));

        List<FundResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("MAC");
    }
}
