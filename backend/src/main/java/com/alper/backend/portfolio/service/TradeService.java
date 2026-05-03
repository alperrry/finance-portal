package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.portfolio.dto.TradeRequest;
import com.alper.backend.portfolio.dto.TradeResponse;
import com.alper.backend.portfolio.event.TradeCancelledEvent;
import com.alper.backend.portfolio.mapper.TradeMapper;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PortfolioItem;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.model.TransactionType;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.TradeTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Trade lifecycle controller-facing service.
 *
 * <p>Sorumluluklar:
 * <ul>
 *     <li>Submit: enstrüman varlık kontrolü, SELL submit-time pozisyon kontrolü</li>
 *     <li>Bond özel akışı: market order olarak anında TradeProcessService.execute</li>
 *     <li>Diğer enstrümanlar: PENDING kaydet, scheduler eşleştirsin</li>
 *     <li>List/Get: ownership-aware sorgular</li>
 *     <li>Cancel: sadece PENDING durumdaki trade'leri CANCELLED'a çevir</li>
 *     <li>Reconnect: WebSocket bağlantı koparınca eksik mesajların REST'ten çekilmesi</li>
 * </ul>
 * </p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class TradeService {

    private final TradeTransactionRepository tradeTransactionRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final TradeMapper tradeMapper;
    private final PortfolioService portfolioService;
    private final TradeProcessService tradeProcessService;
    private final ApplicationEventPublisher eventPublisher;

    private final StockRepository stockRepository;
    private final FundRepository fundRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;

    /**
     * Yeni alış/satış talebi.
     *
     * <p>Akış:
     * <ol>
     *     <li>Portföy ownership kontrolü</li>
     *     <li>Enstrüman varlık kontrolü</li>
     *     <li>SELL ise submit-time pozisyon kontrolü (available = current - pending sells)</li>
     *     <li>BOND ise market order: anında execute, scheduler'a düşmesin</li>
     *     <li>Diğer enstrümanlar: PENDING kaydet, scheduler eşleştirsin</li>
     * </ol>
     * </p>
     */
    @Transactional
    public TradeResponse submitTrade(Long portfolioId, Long userId, TradeRequest request) {
        Portfolio portfolio = portfolioService.getOwnedPortfolio(portfolioId, userId);

        verifyInstrumentExists(request.instrumentType(), request.instrumentId());

        if (request.transactionType() == TransactionType.SELL) {
            verifySellable(portfolio.getId(), request);
        }

        TradeTransaction transaction = tradeMapper.toEntity(request, portfolio.getId());

        if (request.instrumentType() == InstrumentType.BOND) {
            return submitBondMarketOrder(transaction);
        }

        TradeTransaction saved = tradeTransactionRepository.save(transaction);
        log.info("Trade PENDING olarak kaydedildi. tradeId={}, portfolioId={}, type={}, target={}",
                saved.getId(), portfolioId, request.transactionType(), request.targetPrice());
        return tradeMapper.toResponse(saved);
    }

    /**
     * Bond için market order: bond_rate_history'den son faiz oranını çek,
     * bunu execution price olarak kullan ve TradeProcessService ile anında işle.
     * Faiz verisi yoksa BadRequestException.
     */
    private TradeResponse submitBondMarketOrder(TradeTransaction transaction) {
        Optional<BondRateHistory> historyOpt = bondRateHistoryRepository
                .findFirstByBondIdOrderByRateDateDesc(transaction.getInstrumentId());

        if (historyOpt.isEmpty() || historyOpt.get().getInterestRate() == null) {
            throw new BadRequestException("Bond için güncel fiyat verisi bulunamadı");
        }

        // Bond için target_price doldurulması gerekiyor (NOT NULL constraint).
        // Market order olduğu için target = execution.
        BigDecimal executionPrice = historyOpt.get().getInterestRate();
        transaction.setTargetPrice(executionPrice);

        TradeTransaction saved = tradeTransactionRepository.save(transaction);
        tradeProcessService.execute(saved, executionPrice);

        // execute() içinde status APPROVED'a çekildi ve event yayınlandı.
        // saved entity güncel halini almak için yeniden fetch.
        TradeTransaction refreshed = tradeTransactionRepository.findById(saved.getId()).orElse(saved);
        log.info("Bond market order tamamlandı. tradeId={}, status={}", refreshed.getId(), refreshed.getStatus());
        return tradeMapper.toResponse(refreshed);
    }

    /**
     * SELL submit-time kontrolü: available_qty = current_qty - SUM(pending SELL qty).
     * Yetersizse 422 BusinessRuleException.
     */
    private void verifySellable(Long portfolioId, TradeRequest request) {
        BigDecimal currentQty = portfolioItemRepository
                .findByPortfolioIdAndInstrumentTypeAndInstrumentId(
                        portfolioId, request.instrumentType(), request.instrumentId())
                .map(PortfolioItem::getQuantity)
                .orElse(BigDecimal.ZERO);

        BigDecimal pendingSellQty = tradeTransactionRepository
                .sumQuantityByPortfolioInstrumentTypeAndStatus(
                        portfolioId,
                        request.instrumentType(),
                        request.instrumentId(),
                        TransactionType.SELL,
                        TransactionStatus.PENDING
                );
        if (pendingSellQty == null) {
            pendingSellQty = BigDecimal.ZERO;
        }

        BigDecimal available = currentQty.subtract(pendingSellQty);
        if (request.quantity().compareTo(available) > 0) {
            String reason = String.format(
                    "Yetersiz pozisyon. Mevcut: %s, talep: %s, beklemede: %s",
                    currentQty, request.quantity(), pendingSellQty);
            log.warn("SELL submit reddedildi. portfolioId={}, {}", portfolioId, reason);
            throw new BadRequestException(reason);
        }
    }

    /**
     * Enstrümanın ilgili master tablodan varlığını doğrular.
     */
    private void verifyInstrumentExists(InstrumentType type, Long instrumentId) {
        boolean exists = switch (type) {
            case STOCK -> stockRepository.existsById(instrumentId);
            case FUND -> fundRepository.existsById(instrumentId);
            case CURRENCY -> exchangeRateRepository.existsById(instrumentId);
            case BOND -> bondRepository.existsById(instrumentId);
            case VIOP -> false;
        };
        if (!exists) {
            log.warn("Enstrüman bulunamadı. type={}, id={}", type, instrumentId);
            throw new NotFoundException(type.name().toLowerCase());
        }
    }

    @Transactional(readOnly = true)
    public Page<TradeResponse> getTrades(Long portfolioId, Long userId, TransactionStatus statusFilter, Pageable pageable) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);

        Page<TradeTransaction> page = (statusFilter == null)
                ? tradeTransactionRepository.findAllByPortfolioId(portfolioId, pageable)
                : tradeTransactionRepository.findAllByPortfolioIdAndStatus(portfolioId, statusFilter, pageable);

        return page.map(tradeMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public TradeResponse getTradeById(Long portfolioId, Long userId, Long tradeId) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);
        TradeTransaction tx = tradeTransactionRepository.findByIdAndPortfolioId(tradeId, portfolioId)
                .orElseThrow(() -> new NotFoundException("trade"));
        return tradeMapper.toResponse(tx);
    }

    /**
     * WebSocket reconnect senaryosu: belirtilen tarihten sonra updated_at almış trade'leri döner.
     * Frontend bağlantı koptuğunda kaçırdığı event'leri bu endpoint'ten çekerek senkronize olur.
     */
    @Transactional(readOnly = true)
    public List<TradeResponse> getTradesSince(Long portfolioId, Long userId, Instant since) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);
        return tradeTransactionRepository.findAllByPortfolioIdAndUpdatedAtAfter(portfolioId, since).stream()
                .map(tradeMapper::toResponse)
                .toList();
    }

    /**
     * Sadece PENDING durumdaki trade kullanıcı tarafından iptal edilebilir.
     * Diğer durumlar 400 BadRequest döner.
     */
    @Transactional
    public void cancelTrade(Long portfolioId, Long userId, Long tradeId) {
        Portfolio portfolio = portfolioService.getOwnedPortfolio(portfolioId, userId);
        TradeTransaction tx = tradeTransactionRepository.findByIdAndPortfolioId(tradeId, portfolio.getId())
                .orElseThrow(() -> new NotFoundException("trade"));

        if (tx.getStatus() != TransactionStatus.PENDING) {
            log.warn("Sadece PENDING trade iptal edilebilir. tradeId={}, status={}", tradeId, tx.getStatus());
            throw new BadRequestException("Sadece PENDING durumdaki işlem iptal edilebilir");
        }

        tx.setStatus(TransactionStatus.CANCELLED);
        tx.setProcessedAt(Instant.now());
        TradeTransaction saved = tradeTransactionRepository.save(tx);
        log.info("Trade CANCELLED. tradeId={}, userId={}", saved.getId(), userId);

        eventPublisher.publishEvent(TradeCancelledEvent.of(saved, portfolio.getUserId()));
    }
}