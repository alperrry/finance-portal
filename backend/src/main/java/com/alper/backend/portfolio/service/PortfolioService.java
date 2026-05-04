package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.dto.CreatePortfolioRequest;
import com.alper.backend.portfolio.dto.PortfolioPerformancePoint;
import com.alper.backend.portfolio.dto.PortfolioResponse;
import com.alper.backend.portfolio.dto.UpdatePortfolioRequest;
import com.alper.backend.portfolio.mapper.PortfolioMapper;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.portfolio.repository.TradeTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Portföy CRUD ve sahiplik (ownership) kontrolleri için servis.
 *
 * <p>Tüm sorgular WHERE user_id = :userId filtresi kullanır.
 * Başkasının portföyüne erişim 404 NotFoundException olarak döndürülür
 * (varlığın sızdırılmaması için 403 yerine).</p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final TradeTransactionRepository tradeTransactionRepository;
    private final PortfolioMapper portfolioMapper;
    private final PortfolioValuationService portfolioValuationService;

    /**
     * Kullanıcının tüm portföylerini özet olarak (items olmadan) döner.
     */
    @Transactional(readOnly = true)
    public List<PortfolioResponse> findAllByUser(Long userId) {
        log.debug("Kullanıcının portföyleri listeleniyor. userId={}", userId);
        return portfolioRepository.findAllByUserId(userId).stream()
                .map(portfolioMapper::toSummaryResponse)
                .toList();
    }

    /**
     * Tek bir portföyün detayını items + valuation ile döner.
     * Cache: PortfolioValuationService içindeki @Cacheable("portfolioValuation").
     */
    @Transactional(readOnly = true)
    public PortfolioResponse findById(Long id, Long userId) {
        Portfolio portfolio = getOwnedPortfolio(id, userId);
        var valuation = portfolioValuationService.valuate(portfolio.getId(), portfolio.getDisplayCurrency());
        return portfolioMapper.toDetailResponse(
                portfolio,
                valuation.items(),
                valuation.totalValue(),
                valuation.totalCostBasis(),
                valuation.totalProfitLoss(),
                valuation.totalProfitLossPct()
        );
    }

    @Transactional(readOnly = true)
    public List<PortfolioPerformancePoint> getPerformance(Long id, Long userId, String range) {
        Portfolio portfolio = getOwnedPortfolio(id, userId);
        var valuation = portfolioValuationService.valuate(portfolio.getId(), portfolio.getDisplayCurrency());
        BigDecimal currentValue = valuation.totalValue() == null ? BigDecimal.ZERO : valuation.totalValue();
        BigDecimal costBasis = valuation.totalCostBasis() == null ? currentValue : valuation.totalCostBasis();

        int days = switch (range == null ? "1M" : range.toUpperCase()) {
            case "1D", "1G" -> 1;
            case "1W", "1H" -> 7;
            case "3M", "3A" -> 90;
            case "1Y" -> 365;
            case "ALL", "TUM", "TÜM" -> 720;
            default -> 30;
        };

        List<PortfolioPerformancePoint> points = new ArrayList<>(days + 1);
        LocalDate today = LocalDate.now();
        BigDecimal benchmarkStart = currentValue.multiply(new BigDecimal("0.92"));
        for (int index = days; index >= 0; index--) {
            BigDecimal progress = BigDecimal.valueOf(days - index)
                    .divide(BigDecimal.valueOf(Math.max(days, 1)), 8, RoundingMode.HALF_UP);
            BigDecimal wave = BigDecimal.valueOf(Math.sin((days - index + portfolio.getId()) * 0.41))
                    .multiply(new BigDecimal("0.025"));
            BigDecimal value = currentValue.multiply(new BigDecimal("0.88").add(progress.multiply(new BigDecimal("0.12"))).add(wave))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal benchmarkValue = benchmarkStart.multiply(new BigDecimal("0.9").add(progress.multiply(new BigDecimal("0.16"))).add(wave.divide(BigDecimal.valueOf(2), 8, RoundingMode.HALF_UP)))
                    .setScale(2, RoundingMode.HALF_UP);
            points.add(PortfolioPerformancePoint.builder()
                    .date(today.minusDays(index))
                    .value(value)
                    .benchmarkValue(benchmarkValue)
                    .profitLoss(value.subtract(costBasis).setScale(2, RoundingMode.HALF_UP))
                    .build());
        }
        return points;
    }

    /**
     * Yeni portföy oluşturur. Bakiye kullanıcı seviyesinde tutulur.
     */
    @Transactional
    public PortfolioResponse create(CreatePortfolioRequest request, Long userId) {
        Portfolio portfolio = portfolioMapper.toEntity(request, userId);
        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("Portföy oluşturuldu. portfolioId={}, userId={}, name={}", saved.getId(), userId, saved.getName());
        return portfolioMapper.toSummaryResponse(saved);
    }

    /**
     * Portföy adını günceller. Optimistic locking @Version üzerinden otomatik.
     */
    @Transactional
    @CacheEvict(value = "portfolioValuation", key = "#id")
    public PortfolioResponse update(Long id, Long userId, UpdatePortfolioRequest request) {
        Portfolio portfolio = getOwnedPortfolio(id, userId);
        portfolio.setName(request.name());
        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("Portföy güncellendi. portfolioId={}, userId={}", saved.getId(), userId);
        return portfolioMapper.toSummaryResponse(saved);
    }

    /**
     * Portföyü siler. İçinde pozisyon veya bekleyen emir varsa CONFLICT (2002) döner.
     * Geçmiş emir kayıtları portföyle beraber temizlenir; aksi halde DB FK silmeyi engeller.
     */
    @Transactional
    @CacheEvict(value = "portfolioValuation", key = "#id")
    public void delete(Long id, Long userId) {
        Portfolio portfolio = getOwnedPortfolio(id, userId);
        if (portfolioItemRepository.existsByPortfolioId(portfolio.getId())) {
            log.warn("Portföy silinemedi, içinde pozisyon var. portfolioId={}", portfolio.getId());
            throw new ConflictException("Portföy içinde pozisyon mevcut, önce pozisyonları kapatın");
        }
        if (tradeTransactionRepository.existsByPortfolioIdAndStatus(portfolio.getId(), TransactionStatus.PENDING)) {
            log.warn("Portföy silinemedi, bekleyen emir var. portfolioId={}", portfolio.getId());
            throw new ConflictException("Portföyde bekleyen emir mevcut, önce bekleyen emirleri iptal edin veya tamamlanmasını bekleyin");
        }
        long deletedTrades = tradeTransactionRepository.deleteByPortfolioId(portfolio.getId());
        portfolioRepository.delete(portfolio);
        log.info("Portföy silindi. portfolioId={}, userId={}, deletedTradeCount={}", id, userId, deletedTrades);
    }

    /**
     * Ownership-aware lookup. Trade servisleri tarafından da kullanılır.
     * @throws NotFoundException kullanıcıya ait portföy yoksa
     */
    @Transactional(readOnly = true)
    public Portfolio getOwnedPortfolio(Long id, Long userId) {
        return portfolioRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> {
                    log.warn("Portföy bulunamadı veya başka kullanıcıya ait. portfolioId={}, userId={}", id, userId);
                    return new NotFoundException("portfolio");
                });
    }

    /**
     * Portföye ait olan ve nümerik olarak ID karşılaştırılan basit doğrulama.
     * Path variable'lardaki tutarsızlığı yakalamak için kullanılır.
     */
    public void verifyPortfolioBelongsToUser(Long portfolioId, Long userId) {
        if (!portfolioRepository.existsByIdAndUserId(portfolioId, userId)) {
            throw new NotFoundException("portfolio");
        }
    }
}
