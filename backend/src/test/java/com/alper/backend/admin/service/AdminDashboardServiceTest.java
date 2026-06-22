package com.alper.backend.admin.service;

import com.alper.backend.admin.dto.DashboardSummaryResponse;
import com.alper.backend.admin.repository.AuditLogRepository;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.repository.CategoryRepository;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import com.alper.backend.user.model.UserRole;
import com.alper.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AdminDashboardService Testleri")
class AdminDashboardServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private NewsRepository newsRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private StockPriceHistoryRepository stockPriceHistoryRepository;
    @Mock private FundPriceRepository fundPriceRepository;
    @Mock private ExchangeRateRepository exchangeRateRepository;
    @Mock private BondRateHistoryRepository bondRateHistoryRepository;
    @Mock private ViopContractPriceRepository viopContractPriceRepository;
    @Mock private MacroObservationRepository macroObservationRepository;

    private AdminDashboardService service;

    @BeforeEach
    void setUp() {
        service = new AdminDashboardService(
                userRepository, newsRepository, sourceRepository, categoryRepository, auditLogRepository,
                stockPriceHistoryRepository, fundPriceRepository, exchangeRateRepository,
                bondRateHistoryRepository, viopContractPriceRepository, macroObservationRepository
        );

        // Sayımlar
        when(userRepository.count()).thenReturn(10L);
        when(userRepository.countByIsActiveTrue()).thenReturn(8L);
        when(userRepository.countByRole(UserRole.ADMIN)).thenReturn(2L);
        when(newsRepository.count()).thenReturn(100L);
        when(newsRepository.countByCreatedAtAfter(any())).thenReturn(5L);
        when(newsRepository.countByStatus(NewsStatus.published)).thenReturn(90L);
        when(sourceRepository.count()).thenReturn(12L);
        when(sourceRepository.countByIsActiveTrue()).thenReturn(9L);
        when(categoryRepository.count()).thenReturn(7L);
        when(auditLogRepository.countByCreatedAtAfter(any())).thenReturn(3L);

        // Tazelik kayıt sayıları
        lenient().when(stockPriceHistoryRepository.count()).thenReturn(500L);
        lenient().when(fundPriceRepository.count()).thenReturn(400L);
        lenient().when(exchangeRateRepository.count()).thenReturn(300L);
        lenient().when(bondRateHistoryRepository.count()).thenReturn(200L);
        lenient().when(viopContractPriceRepository.count()).thenReturn(100L);
        lenient().when(macroObservationRepository.count()).thenReturn(50L);
    }

    @Test
    @DisplayName("Sayımlar ve modül sayısı doğru döner")
    void getSummary_returnsCountsAndModules() {
        stubFreshnessDates(LocalDate.now(), LocalDate.now());

        DashboardSummaryResponse result = service.getSummary();

        assertThat(result.counts().totalUsers()).isEqualTo(10L);
        assertThat(result.counts().activeUsers()).isEqualTo(8L);
        assertThat(result.counts().adminUsers()).isEqualTo(2L);
        assertThat(result.counts().totalNews()).isEqualTo(100L);
        assertThat(result.counts().news24h()).isEqualTo(5L);
        assertThat(result.counts().publishedNews()).isEqualTo(90L);
        assertThat(result.counts().activeSources()).isEqualTo(9L);
        assertThat(result.counts().audit24h()).isEqualTo(3L);
        assertThat(result.marketFreshness()).hasSize(6);
    }

    @Test
    @DisplayName("Güncel veri taze, eski/eksik veri bayat işaretlenir")
    void getSummary_marksStaleCorrectly() {
        // stocks: bugün -> taze, fx: çok eski -> bayat, macro: null -> bayat
        StockPriceHistory sph = org.mockito.Mockito.mock(StockPriceHistory.class);
        when(sph.getTradeDate()).thenReturn(LocalDate.now());
        when(stockPriceHistoryRepository.findTopByOrderByTradeDateDesc()).thenReturn(Optional.of(sph));

        ExchangeRate er = org.mockito.Mockito.mock(ExchangeRate.class);
        when(er.getRateDate()).thenReturn(LocalDate.now().minusDays(30));
        when(exchangeRateRepository.findTopByOrderByRateDateDesc()).thenReturn(Optional.of(er));

        when(macroObservationRepository.findTopByOrderByObservationDateDesc()).thenReturn(Optional.empty());

        FundPrice fp = org.mockito.Mockito.mock(FundPrice.class);
        when(fp.getPriceDate()).thenReturn(LocalDate.now());
        when(fundPriceRepository.findTopByOrderByPriceDateDesc()).thenReturn(Optional.of(fp));
        BondRateHistory brh = org.mockito.Mockito.mock(BondRateHistory.class);
        when(brh.getRateDate()).thenReturn(LocalDate.now());
        when(bondRateHistoryRepository.findTopByOrderByRateDateDesc()).thenReturn(Optional.of(brh));
        when(viopContractPriceRepository.findTopByOrderByTradeDateDesc()).thenReturn(Optional.empty());

        DashboardSummaryResponse result = service.getSummary();

        var byModule = result.marketFreshness().stream()
                .collect(java.util.stream.Collectors.toMap(
                        DashboardSummaryResponse.ModuleFreshness::module, m -> m));
        assertThat(byModule.get("stocks").stale()).isFalse();
        assertThat(byModule.get("stocks").recordCount()).isEqualTo(500L);
        assertThat(byModule.get("fx").stale()).isTrue();
        assertThat(byModule.get("macro").stale()).isTrue();
        assertThat(byModule.get("macro").lastUpdated()).isNull();
    }

    private void stubFreshnessDates(LocalDate fresh, LocalDate other) {
        StockPriceHistory sph = org.mockito.Mockito.mock(StockPriceHistory.class);
        lenient().when(sph.getTradeDate()).thenReturn(fresh);
        lenient().when(stockPriceHistoryRepository.findTopByOrderByTradeDateDesc()).thenReturn(Optional.of(sph));
        FundPrice fp = org.mockito.Mockito.mock(FundPrice.class);
        lenient().when(fp.getPriceDate()).thenReturn(other);
        lenient().when(fundPriceRepository.findTopByOrderByPriceDateDesc()).thenReturn(Optional.of(fp));
        ExchangeRate er = org.mockito.Mockito.mock(ExchangeRate.class);
        lenient().when(er.getRateDate()).thenReturn(other);
        lenient().when(exchangeRateRepository.findTopByOrderByRateDateDesc()).thenReturn(Optional.of(er));
        BondRateHistory brh = org.mockito.Mockito.mock(BondRateHistory.class);
        lenient().when(brh.getRateDate()).thenReturn(other);
        lenient().when(bondRateHistoryRepository.findTopByOrderByRateDateDesc()).thenReturn(Optional.of(brh));
        lenient().when(viopContractPriceRepository.findTopByOrderByTradeDateDesc()).thenReturn(Optional.empty());
        lenient().when(macroObservationRepository.findTopByOrderByObservationDateDesc()).thenReturn(Optional.empty());
    }
}
