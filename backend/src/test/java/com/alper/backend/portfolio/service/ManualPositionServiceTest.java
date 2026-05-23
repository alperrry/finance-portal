package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.dto.ManualPositionResponse;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.pnl.PnlCalculatorRegistry;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManualPositionService")
class ManualPositionServiceTest {

    @Mock private ManualPositionRepository repository;
    @Mock private PortfolioService portfolioService;
    @Mock private InstrumentPriceResolverService priceResolver;

    private ManualPositionService service;

    @BeforeEach
    void setUp() {
        service = new ManualPositionService(
                repository,
                portfolioService,
                priceResolver,
                new PnlCalculatorRegistry()
        );
    }

    @Test
    @DisplayName("Açık CURRENCY listesinde güncel kur, güncel değer ve K/Z döner")
    void listOpenCurrency_returnsCurrentPriceValueAndPnl() {
        ManualPosition eur = ManualPosition.builder()
                .id(10L)
                .portfolioId(1L)
                .instrumentType(InstrumentType.CURRENCY)
                .positionKind(PositionKind.OPEN)
                .instrumentId(20L)
                .instrumentSymbol("EUR")
                .instrumentName("Euro")
                .quantity(new BigDecimal("1000.00"))
                .entryPrice(new BigDecimal("35.00"))
                .entryDate(LocalDate.of(2026, 1, 1))
                .build();

        when(repository.findAllByPortfolioIdAndPositionKind(1L, PositionKind.OPEN, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(eur)));
        when(priceResolver.resolve(InstrumentType.CURRENCY, 20L, "EUR"))
                .thenReturn(new InstrumentPriceResolverService.InstrumentInfo(
                        "EUR", "Euro", "TRY", new BigDecimal("40.00")));

        Page<ManualPositionResponse> page = service.list(1L, 99L, PositionKind.OPEN, PageRequest.of(0, 20));

        ManualPositionResponse response = page.getContent().getFirst();
        assertThat(response.currentPrice()).isEqualByComparingTo("40.00");
        assertThat(response.currentValue()).isEqualByComparingTo("40000.00");
        assertThat(response.unrealizedPnl()).isEqualByComparingTo("5000.00");
        assertThat(response.pnlPercent()).isEqualByComparingTo("14.29");
    }
}
