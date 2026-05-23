package com.alper.backend.portfolio.simulation;

import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.pnl.PnlCalculatorRegistry;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.portfolio.service.InstrumentPriceResolverService;
import com.alper.backend.portfolio.simulation.lens.ValuationLensRegistry;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.service.HistoricalFundPriceResolver;
import com.alper.backend.portfolio.simulation.service.HistoricalRateResolver;
import com.alper.backend.portfolio.simulation.service.HistoricalStockPriceResolver;
import com.alper.backend.portfolio.simulation.service.SimulationService;
import com.alper.backend.portfolio.simulation.service.ValuationContextBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SimulationService")
class SimulationServiceTest {

    @Mock private PortfolioRepository portfolioRepository;
    @Mock private ManualPositionRepository manualPositionRepository;
    @Mock private ValuationContextBuilder contextBuilder;
    @Mock private ValuationLensRegistry lensRegistry;
    @Mock private PnlCalculatorRegistry pnlRegistry;
    @Mock private InstrumentPriceResolverService priceResolver;
    @Mock private StringRedisTemplate stringRedisTemplate;
    @Mock private ValueOperations<String, String> valueOps;
    @Mock private ObjectMapper objectMapper;
    @Mock private HistoricalRateResolver historicalRateResolver;
    @Mock private HistoricalStockPriceResolver historicalStockPriceResolver;
    @Mock private HistoricalFundPriceResolver historicalFundPriceResolver;

    private SimulationService service;

    private static final Long USER_ID      = 1L;
    private static final Long POS_ID       = 200L;
    private static final Long PORTFOLIO_ID = 10L;

    @BeforeEach
    void setUp() {
        service = new SimulationService(
                portfolioRepository, manualPositionRepository,
                contextBuilder, lensRegistry, pnlRegistry, priceResolver, objectMapper,
                historicalRateResolver, historicalStockPriceResolver, historicalFundPriceResolver);
        // StringRedisTemplate is @Autowired(required=false) — set via reflection to simulate cache miss
        org.springframework.test.util.ReflectionTestUtils.setField(service, "stringRedisTemplate", null);
    }

    // --- ManualPosition tests ---

    @Test
    @DisplayName("position bulunamazsa NotFoundException fırlatılır")
    void simulateManualPosition_notFound() {
        when(manualPositionRepository.findById(POS_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.simulateManualPosition(POS_ID, List.of(LensType.USD), USER_ID))
                .isInstanceOf(NotFoundException.class);
    }

    // --- WhatIf tests ---

    @Test
    @DisplayName("whatIf: position bulunamazsa NotFoundException fırlatılır")
    void simulateWhatIf_positionNotFound() {
        when(manualPositionRepository.findById(POS_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.simulateWhatIfScenario(POS_ID, InstrumentType.STOCK, "GARAN.IS", List.of(), USER_ID))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("whatIf: position başka kullanıcıya aitse NotFoundException fırlatılır")
    void simulateWhatIf_otherUserGets404() {
        ManualPosition pos = ManualPosition.builder()
                .id(POS_ID).portfolioId(PORTFOLIO_ID)
                .instrumentType(InstrumentType.STOCK).positionKind(PositionKind.OPEN)
                .quantity(BigDecimal.TEN).entryPrice(BigDecimal.TEN)
                .entryDate(LocalDate.now()).build();
        when(manualPositionRepository.findById(POS_ID)).thenReturn(Optional.of(pos));
        when(portfolioRepository.findByIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.simulateWhatIfScenario(POS_ID, InstrumentType.FUND, "AK1", List.of(), USER_ID))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("position başka kullanıcıya aitse NotFoundException fırlatılır (404 pattern)")
    void simulateManualPosition_otherUserGets404() {
        ManualPosition pos = ManualPosition.builder()
                .id(POS_ID).portfolioId(PORTFOLIO_ID)
                .instrumentType(InstrumentType.STOCK).positionKind(PositionKind.OPEN)
                .quantity(BigDecimal.TEN).entryPrice(BigDecimal.TEN)
                .entryDate(LocalDate.now()).build();
        when(manualPositionRepository.findById(POS_ID)).thenReturn(Optional.of(pos));
        when(portfolioRepository.findByIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.simulateManualPosition(POS_ID, List.of(LensType.USD), USER_ID))
                .isInstanceOf(NotFoundException.class);
    }
}
