package com.alper.backend.admin.service;

import com.alper.backend.admin.dto.DashboardSummaryResponse;
import com.alper.backend.admin.dto.DashboardSummaryResponse.Counts;
import com.alper.backend.admin.dto.DashboardSummaryResponse.ModuleFreshness;
import com.alper.backend.admin.repository.AuditLogRepository;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.repository.CategoryRepository;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import com.alper.backend.user.model.UserRole;
import com.alper.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.function.Supplier;

/**
 * Admin dashboard için operasyonel özet üretir.
 *
 * <p>Genel sayımları (kullanıcı/haber/kaynak/audit) ve piyasa modüllerinin veri
 * tazeliğini mevcut repository metotları üzerinden tek çağrıda toplar. Yalnızca okuma
 * yapar, hiçbir yan etkisi yoktur.</p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class AdminDashboardService {

    /** Bir modülün son verisi bu kadar günden eskiyse "bayat" sayılır (hafta sonu + tatil payı). */
    private static final long STALE_THRESHOLD_DAYS = 4;

    private final UserRepository userRepository;
    private final NewsRepository newsRepository;
    private final SourceRepository sourceRepository;
    private final CategoryRepository categoryRepository;
    private final AuditLogRepository auditLogRepository;

    private final StockPriceHistoryRepository stockPriceHistoryRepository;
    private final FundPriceRepository fundPriceRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;
    private final ViopContractPriceRepository viopContractPriceRepository;
    private final MacroObservationRepository macroObservationRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary() {
        log.debug("Admin dashboard özeti hesaplanıyor.");

        Instant audfrom = Instant.now().minus(24, ChronoUnit.HOURS);
        OffsetDateTime newsFrom = OffsetDateTime.now().minusHours(24);
        LocalDate today = LocalDate.now();

        Counts counts = Counts.builder()
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countByIsActiveTrue())
                .adminUsers(userRepository.countByRole(UserRole.ADMIN))
                .totalNews(newsRepository.count())
                .news24h(newsRepository.countByCreatedAtAfter(newsFrom))
                .publishedNews(newsRepository.countByStatus(NewsStatus.published))
                .totalSources(sourceRepository.count())
                .activeSources(sourceRepository.countByIsActiveTrue())
                .totalCategories(categoryRepository.count())
                .audit24h(auditLogRepository.countByCreatedAtAfter(audfrom))
                .build();

        List<ModuleFreshness> freshness = List.of(
                freshness("stocks", today,
                        () -> stockPriceHistoryRepository.findTopByOrderByTradeDateDesc().map(s -> s.getTradeDate()).orElse(null),
                        stockPriceHistoryRepository.count()),
                freshness("funds", today,
                        () -> fundPriceRepository.findTopByOrderByPriceDateDesc().map(f -> f.getPriceDate()).orElse(null),
                        fundPriceRepository.count()),
                freshness("fx", today,
                        () -> exchangeRateRepository.findTopByOrderByRateDateDesc().map(e -> e.getRateDate()).orElse(null),
                        exchangeRateRepository.count()),
                freshness("bonds", today,
                        () -> bondRateHistoryRepository.findTopByOrderByRateDateDesc().map(b -> b.getRateDate()).orElse(null),
                        bondRateHistoryRepository.count()),
                freshness("viop", today,
                        () -> viopContractPriceRepository.findTopByOrderByTradeDateDesc().map(v -> v.getTradeDate()).orElse(null),
                        viopContractPriceRepository.count()),
                freshness("macro", today,
                        () -> macroObservationRepository.findTopByOrderByObservationDateDesc().map(m -> m.getObservationDate()).orElse(null),
                        macroObservationRepository.count())
        );

        return DashboardSummaryResponse.builder()
                .counts(counts)
                .marketFreshness(freshness)
                .build();
    }

    private ModuleFreshness freshness(String module, LocalDate today, Supplier<LocalDate> lastUpdatedSupplier, long recordCount) {
        LocalDate lastUpdated = lastUpdatedSupplier.get();
        boolean stale = lastUpdated == null || lastUpdated.isBefore(today.minusDays(STALE_THRESHOLD_DAYS));
        return ModuleFreshness.builder()
                .module(module)
                .lastUpdated(lastUpdated)
                .recordCount(recordCount)
                .stale(stale)
                .build();
    }
}
