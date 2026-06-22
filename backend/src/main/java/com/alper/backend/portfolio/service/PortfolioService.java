package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.dto.CreatePortfolioRequest;
import com.alper.backend.portfolio.dto.PortfolioResponse;
import com.alper.backend.portfolio.dto.UpdatePortfolioRequest;
import com.alper.backend.portfolio.mapper.PortfolioMapper;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final ManualPositionRepository manualPositionRepository;
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
                valuation.totalProfitLossPct(),
                valuation.openPositionCount()
        );
    }

    /**
     * Yeni portföy oluşturur.
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
     * Portföyü siler. İçinde pozisyon veya açık manuel pozisyon varsa CONFLICT döner.
     */
    @Transactional
    @CacheEvict(value = "portfolioValuation", key = "#id")
    public void delete(Long id, Long userId) {
        Portfolio portfolio = getOwnedPortfolio(id, userId);
        if (portfolioItemRepository.existsByPortfolioId(portfolio.getId())) {
            log.warn("Portföy silinemedi, içinde pozisyon var. portfolioId={}", portfolio.getId());
            throw new ConflictException("Portföy içinde pozisyon mevcut, önce pozisyonları kapatın");
        }
        if (manualPositionRepository.existsByPortfolioIdAndPositionKind(portfolio.getId(), PositionKind.OPEN)) {
            log.warn("Portföy silinemedi, açık manuel pozisyon var. portfolioId={}", portfolio.getId());
            throw new ConflictException("Portföyde açık pozisyon mevcut, önce pozisyonları kapatın");
        }
        portfolioRepository.delete(portfolio);
        log.info("Portföy silindi. portfolioId={}, userId={}", id, userId);
    }

    /**
     * Ownership-aware lookup. Başka servislerin de kullanabileceği yardımcı metot.
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
