package com.alper.backend.market.bond.service;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.model.BondType;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.dto.BondResponse;
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
@DisplayName("BondQueryService")
class BondQueryServiceTest {

    @Mock private BondRateHistoryRepository repository;
    @Mock private BondRepository bondRepository;
    private BondQueryService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new BondQueryService(repository, bondRepository);
    }

    private Bond bond(String code, String name, BondType type, Integer maturityDays) {
        return Bond.builder()
                .id(1L)
                .evdsSeriesCode(code)
                .name(name)
                .bondType(type)
                .maturityDays(maturityDays)
                .currency("TRY")
                .build();
    }

    private BondRateHistory rate(Bond b, LocalDate date, String rate, String compounded) {
        return BondRateHistory.builder()
                .bond(b)
                .rateDate(date)
                .interestRate(new BigDecimal(rate))
                .compoundedRate(compounded == null ? null : new BigDecimal(compounded))
                .source("TCMB_EVDS")
                .build();
    }

    @Test
    @DisplayName("Birden fazla bond'un en son rate'leri DTO listesine dönüşür")
    void multipleBondsMapToResponseList() {
        Bond dt = bond("TP.YT.DEVTAH.10Y", "10 Yıllık Devlet Tahvili", BondType.DEVLET_TAHVIL, 3650);
        Bond hb = bond("TP.HZNBNO.91G", "91 Günlük Hazine Bonosu", BondType.HAZINE_BONOSU, 91);

        when(repository.findLatestRates()).thenReturn(List.of(
                rate(dt, LocalDate.of(2026, 4, 24), "42.8500", "44.0100"),
                rate(hb, LocalDate.of(2026, 4, 24), "45.1200", null)
        ));

        List<BondResponse> result = service.getAll();

        assertThat(result).hasSize(2);
        BondResponse first = result.get(0);
        assertThat(first.getEvdsSeriesCode()).isEqualTo("TP.YT.DEVTAH.10Y");
        assertThat(first.getName()).isEqualTo("10 Yıllık Devlet Tahvili");
        assertThat(first.getBondType()).isEqualTo(BondType.DEVLET_TAHVIL);
        assertThat(first.getMaturityDays()).isEqualTo(3650);
        assertThat(first.getCurrency()).isEqualTo("TRY");
        assertThat(first.getInterestRate()).isEqualByComparingTo("42.8500");
        assertThat(first.getCompoundedRate()).isEqualByComparingTo("44.0100");
        assertThat(first.getRateDate()).isEqualTo(LocalDate.of(2026, 4, 24));

        BondResponse second = result.get(1);
        assertThat(second.getEvdsSeriesCode()).isEqualTo("TP.HZNBNO.91G");
        assertThat(second.getCompoundedRate()).isNull();  // optional alan
    }

    @Test
    @DisplayName("Boş repository sonucu için boş liste döner (exception atılmaz)")
    void emptyRepositoryReturnsEmptyList() {
        when(repository.findLatestRates()).thenReturn(Collections.emptyList());

        List<BondResponse> result = service.getAll();

        assertThat(result).isNotNull().isEmpty();
    }

    @Test
    @DisplayName("Tek kayıt başarıyla dönüşür")
    void singleRecordMapsCorrectly() {
        Bond b = bond("TP.YT.DEVTAH.5Y", "5 Yıllık", BondType.DEVLET_TAHVIL, 1825);
        when(repository.findLatestRates()).thenReturn(List.of(
                rate(b, LocalDate.of(2026, 4, 24), "39.2000", "40.1000")
        ));

        List<BondResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEvdsSeriesCode()).isEqualTo("TP.YT.DEVTAH.5Y");
    }

    @Test
    @DisplayName("Repository'nin döndürdüğü sıra response'ta korunur")
    void repositoryOrderIsPreserved() {
        Bond b1 = bond("AAA", "AAA Tahvil", BondType.DEVLET_TAHVIL, 365);
        Bond b2 = bond("BBB", "BBB Tahvil", BondType.HAZINE_BONOSU, 91);
        Bond b3 = bond("CCC", "CCC Tahvil", BondType.DEVLET_TAHVIL, 730);

        when(repository.findLatestRates()).thenReturn(List.of(
                rate(b3, LocalDate.of(2026, 4, 24), "10", null),
                rate(b1, LocalDate.of(2026, 4, 24), "20", null),
                rate(b2, LocalDate.of(2026, 4, 24), "30", null)
        ));

        List<BondResponse> result = service.getAll();

        assertThat(result).extracting(BondResponse::getEvdsSeriesCode)
                .containsExactly("CCC", "AAA", "BBB");
    }

    @Test
    @DisplayName("Maturity days null olsa da response üretilir")
    void nullMaturityDaysIsTolerated() {
        Bond b = bond("X", "Test", BondType.DEVLET_TAHVIL, null);
        when(repository.findLatestRates()).thenReturn(List.of(
                rate(b, LocalDate.of(2026, 4, 24), "30", null)
        ));

        List<BondResponse> result = service.getAll();

        assertThat(result.get(0).getMaturityDays()).isNull();
    }

    @Test
    @DisplayName("Rate kaydı olmayan aktif tahviller includeUnpriced listesinde null rate alanlarıyla döner")
    void unpricedBondsAreIncludedWithNullRateFields() {
        Bond priced = bond("TP.PRICED.ORAN", "Fiyatlı Tahvil", BondType.DEVLET_TAHVIL, 730);
        Bond unpriced = bond("TP.UNPRICED.ORAN", "Fiyatsız Tahvil", BondType.HAZINE_BONOSU, 180);
        BondRateHistory rate = rate(priced, LocalDate.of(2026, 4, 24), "42.8500", "44.0100");

        when(bondRepository.findActiveWithLatestRate()).thenReturn(List.of(
                new Object[] { priced, rate },
                new Object[] { unpriced, null }
        ));

        List<BondResponse> result = service.getAllIncludingUnpriced();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getEvdsSeriesCode()).isEqualTo("TP.PRICED.ORAN");
        assertThat(result.get(0).getInterestRate()).isEqualByComparingTo("42.8500");
        assertThat(result.get(1).getEvdsSeriesCode()).isEqualTo("TP.UNPRICED.ORAN");
        assertThat(result.get(1).getName()).isEqualTo("Fiyatsız Tahvil");
        assertThat(result.get(1).getBondType()).isEqualTo(BondType.HAZINE_BONOSU);
        assertThat(result.get(1).getInterestRate()).isNull();
        assertThat(result.get(1).getCompoundedRate()).isNull();
        assertThat(result.get(1).getRateDate()).isNull();
    }
}
