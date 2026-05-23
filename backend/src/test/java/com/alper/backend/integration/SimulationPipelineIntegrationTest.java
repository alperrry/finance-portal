package com.alper.backend.integration;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.common.TurkishHolidayUtil;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.SimulationResponse;
import com.alper.backend.portfolio.simulation.service.SimulationService;
import com.alper.backend.user.model.User;
import com.alper.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Simulation Pipeline Integration")
class SimulationPipelineIntegrationTest extends AbstractIntegrationTest {

    @Autowired private SimulationService simulationService;
    @Autowired private UserRepository userRepository;
    @Autowired private PortfolioRepository portfolioRepository;
    @Autowired private ManualPositionRepository manualPositionRepository;

    private User testUser;
    private Portfolio testPortfolio;

    // Exchange rate dates: Friday + Monday (Saturday/Sunday gap)
    // Using past dates to avoid holiday edge cases on test run day
    private static final LocalDate FRIDAY   = LocalDate.of(2025, 5, 2);   // Friday
    private static final LocalDate SATURDAY = LocalDate.of(2025, 5, 3);   // Saturday — no rate
    private static final LocalDate MONDAY   = LocalDate.of(2025, 5, 5);   // Monday

    // Rates: USD/TRY
    private static final BigDecimal FRIDAY_BUYING   = new BigDecimal("32.40");
    private static final BigDecimal FRIDAY_SELLING  = new BigDecimal("32.70");
    private static final BigDecimal MONDAY_BUYING   = new BigDecimal("33.00");
    private static final BigDecimal MONDAY_SELLING  = new BigDecimal("33.30");
    // "Current" rate used for today's UsdLens buying-rate lookup
    private static final BigDecimal CURRENT_BUYING  = new BigDecimal("35.00");
    private static final BigDecimal CURRENT_SELLING = new BigDecimal("35.40");

    @BeforeEach
    void setUpSimulationData() {
        // Clean portfolio tables
        jdbcTemplate.execute("TRUNCATE TABLE manual_positions, portfolios RESTART IDENTITY CASCADE");

        // Seed exchange rates.
        // FRIDAY/MONDAY for the manual-position weekend-fallback tests.
        // lastCompletedTradingDay so PortfolioItem.createdAt (set to now by JPA) resolves.
        LocalDate lastTradingDay = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
        insertExchangeRate("USD", "US DOLLAR", 1, FRIDAY_BUYING,  FRIDAY_SELLING,  FRIDAY);
        insertExchangeRate("USD", "US DOLLAR", 1, MONDAY_BUYING,  MONDAY_SELLING,  MONDAY);
        insertExchangeRate("USD", "US DOLLAR", 1, CURRENT_BUYING, CURRENT_SELLING, lastTradingDay);

        // Get or create test user
        testUser = userRepository.findByKeycloakId("sim-test-user-kc-id")
                .orElseGet(() -> userRepository.save(User.builder()
                        .keycloakId("sim-test-user-kc-id")
                        .username("sim_test_user")
                        .email("sim_test@test.internal")
                        .role(com.alper.backend.user.model.UserRole.NORMAL_USER)
                        .isActive(true)
                        .build()));

        // Create test portfolio
        testPortfolio = portfolioRepository.save(Portfolio.builder()
                .userId(testUser.getId())
                .name("Simülasyon Test Portföyü")
                .displayCurrency("TRY")
                .version(0L)
                .build());

        // Seed stock price snapshot for AKBNK.IS (stock is seeded by Flyway)
        insertSnapshot("AKBNK.IS", new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("ManualPosition açık pozisyon — USD lens hesaplar; Pazartesi oranı Cuma'ya bakar")
    void manualPosition_openPosition_weekendFallback() {
        // Entry on SATURDAY — resolver must walk back to FRIDAY's rate
        ManualPosition openPos = manualPositionRepository.save(ManualPosition.builder()
                .portfolioId(testPortfolio.getId())
                .instrumentType(InstrumentType.STOCK)
                .positionKind(PositionKind.OPEN)
                .instrumentId(stock("AKBNK.IS").getId())
                .instrumentSymbol("AKBNK.IS")
                .instrumentName("Akbank")
                .quantity(new BigDecimal("50"))
                .entryPrice(new BigDecimal("45.00"))
                .entryDate(SATURDAY) // Resolver must walk back to FRIDAY
                .build());

        SimulationResponse response = simulationService.simulateManualPosition(
                openPos.getId(), List.of(LensType.USD), testUser.getId());

        assertThat(response).isNotNull();
        assertThat(response.summary().positionKind()).isEqualTo("OPEN");

        LensResult usdLens = response.lenses().get(LensType.USD);
        assertThat(usdLens).isNotNull();
        assertThat(usdLens.currency()).isEqualTo("USD");

        // purchaseRate MUST be FRIDAY_SELLING (walked back from Saturday)
        assertThat(usdLens.purchaseRate()).isEqualByComparingTo(FRIDAY_SELLING);

        // Cost basis: 45 * 50 = 2250 TRY / 32.70 = ~68.81 USD
        BigDecimal expectedCostUsd = new BigDecimal("2250.00")
                .divide(FRIDAY_SELLING, 2, java.math.RoundingMode.HALF_UP);
        assertThat(usdLens.costBasis()).isEqualByComparingTo(expectedCostUsd);
    }

    @Test
    @DisplayName("ManualPosition kapalı pozisyon — USD lens SELLING alış + BUYING kapanış oranı kullanır")
    void manualPosition_closedPosition_correctDirections() {
        // Entry on MONDAY (rate exists), close on MONDAY (same rate for buying)
        // Entry: 50 TRY * 200 qty = 10000 TRY / 33.30 SELLING = ~300.30 USD
        // Close: 60 TRY * 200 qty = 12000 TRY / 33.00 BUYING  = ~363.64 USD
        ManualPosition closedPos = manualPositionRepository.save(ManualPosition.builder()
                .portfolioId(testPortfolio.getId())
                .instrumentType(InstrumentType.STOCK)
                .positionKind(PositionKind.CLOSED)
                .instrumentId(stock("AKBNK.IS").getId())
                .instrumentSymbol("AKBNK.IS")
                .instrumentName("Akbank")
                .quantity(new BigDecimal("200"))
                .entryPrice(new BigDecimal("50.00"))
                .entryDate(MONDAY)
                .exitPrice(new BigDecimal("60.00"))
                .exitDate(MONDAY)
                .realizedPnl(new BigDecimal("2000.00")) // (60-50)*200
                .build());

        SimulationResponse response = simulationService.simulateManualPosition(
                closedPos.getId(), List.of(LensType.USD), testUser.getId());

        assertThat(response).isNotNull();
        assertThat(response.summary().positionKind()).isEqualTo("CLOSED");

        LensResult usdLens = response.lenses().get(LensType.USD);
        assertThat(usdLens).isNotNull();
        assertThat(usdLens.currency()).isEqualTo("USD");

        // purchaseRate must be MONDAY_SELLING
        assertThat(usdLens.purchaseRate()).isEqualByComparingTo(MONDAY_SELLING);
        // referenceRate must be MONDAY_BUYING
        assertThat(usdLens.referenceRate()).isEqualByComparingTo(MONDAY_BUYING);
        assertThat(usdLens.referenceDate()).isEqualTo(MONDAY);

        // USD P&L should be positive (close value in USD > cost in USD)
        assertThat(usdLens.absolutePnl()).isPositive();
    }
}
