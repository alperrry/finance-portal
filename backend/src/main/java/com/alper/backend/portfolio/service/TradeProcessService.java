package com.alper.backend.portfolio.service;

import com.alper.backend.portfolio.event.TradeApprovedEvent;
import com.alper.backend.portfolio.event.TradeRejectedEvent;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PortfolioItem;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.model.TransactionType;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.portfolio.repository.TradeTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;

/**
 * Trade lifecycle status machine.
 *
 * <p>Yürütülen adımlar:
 * <ol>
 *     <li>Enstrüman uygunluğu (mevcut tasarımda submit-time'da yapıldığı için placeholder)</li>
 *     <li>İşlem saati kontrolü (placeholder, ileride TurkishHolidayUtil ile aktive edilebilir)</li>
 *     <li>Limit kontrolleri (placeholder)</li>
 * </ol>
 * Hepsi geçerse APPROVED + portfolio_items güncellenir, biri başarısız olursa REJECTED.</p>
 *
 * <p>Status değişimleri ApplicationEventPublisher üzerinden yayınlanır;
 * TradeNotificationService AFTER_COMMIT fazında WebSocket mesajı atar.</p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class TradeProcessService {

    private static final int QUANTITY_SCALE = 6;
    private static final int AMOUNT_SCALE = 2;

    private final TradeTransactionRepository tradeTransactionRepository;
    private final PortfolioRepository portfolioRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TradeCurrencyService tradeCurrencyService;

    /**
     * Trade'i verilen gerçekleşme fiyatıyla işle.
     * Tek bir transaction içinde adımları çalıştırır, başarısızlık durumunda REJECTED kaydeder.
     */
    @Transactional
    public void execute(TradeTransaction transaction, BigDecimal executionPrice) {
        log.info("Trade işleniyor. tradeId={}, type={}, executionPrice={}",
                transaction.getId(), transaction.getTransactionType(), executionPrice);

        try {
            checkInstrumentEligibility(transaction);
            checkTradingHours(transaction);
            checkLimits(transaction);

            applyToPortfolio(transaction, executionPrice);
            approve(transaction, executionPrice);
        } catch (TradeRejectionException e) {
            reject(transaction, e.getMessage());
        }
    }

    private void checkInstrumentEligibility(TradeTransaction transaction) {
        // Submit-time TradeService.submitTrade içinde enstrüman varlığı kontrolü zaten yapılır.
        // Burada placeholder olarak duruyor, ileride pasif enstrüman kontrolü vs eklenebilir.
        log.debug("Enstrüman uygunluğu kontrolü geçildi. tradeId={}", transaction.getId());
    }

    private void checkTradingHours(TradeTransaction transaction) {
        // Placeholder. İleride TurkishHolidayUtil ve borsa saatleri ile aktif edilebilir.
        log.debug("İşlem saati kontrolü geçildi (placeholder). tradeId={}", transaction.getId());
    }

    private void checkLimits(TradeTransaction transaction) {
        // Placeholder. İleride per-instrument limit, daily volume limit eklenebilir.
        log.debug("Limit kontrolü geçildi (placeholder). tradeId={}", transaction.getId());
    }

    /**
     * Portfolio item ve kullanıcı bakiyesini Average Cost yöntemiyle günceller.
     */
    private void applyToPortfolio(TradeTransaction transaction, BigDecimal executionPrice) {
        Portfolio portfolio = getPortfolio(transaction.getPortfolioId());
        Optional<PortfolioItem> existingItemOpt = portfolioItemRepository
                .findByPortfolioIdAndInstrumentTypeAndInstrumentId(
                        transaction.getPortfolioId(),
                        transaction.getInstrumentType(),
                        transaction.getInstrumentId()
                );

        SettlementAmounts settlement = calculateSettlementAmounts(transaction, portfolio, executionPrice);
        transaction.setTotalAmount(settlement.totalInPortfolioCurrency());

        if (transaction.getTransactionType() == TransactionType.BUY) {
            applyBuy(transaction, portfolio, executionPrice, existingItemOpt, settlement);
        } else {
            applySell(transaction, portfolio, executionPrice, existingItemOpt, settlement);
        }
    }

    private void applyBuy(TradeTransaction transaction, Portfolio portfolio, BigDecimal executionPrice,
                          Optional<PortfolioItem> existingItemOpt, SettlementAmounts settlement) {
        BigDecimal qty = transaction.getQuantity();

        PortfolioItem item = existingItemOpt.map(existing -> {
            BigDecimal oldQty = existing.getQuantity();
            BigDecimal oldAvgCost = existing.getAvgCost();
            BigDecimal newQty = oldQty.add(qty);
            BigDecimal newAvgCost = oldQty.multiply(oldAvgCost)
                    .add(qty.multiply(executionPrice))
                    .divide(newQty, QUANTITY_SCALE, RoundingMode.HALF_UP);
            existing.setQuantity(newQty);
            existing.setAvgCost(newAvgCost);
            log.debug("Pozisyon güncellendi (alış). tradeId={}, oldQty={}, addQty={}, newQty={}, newAvgCost={}",
                    transaction.getId(), oldQty, qty, newQty, newAvgCost);
            return existing;
        }).orElseGet(() -> PortfolioItem.builder()
                .portfolioId(transaction.getPortfolioId())
                .instrumentType(transaction.getInstrumentType())
                .instrumentId(transaction.getInstrumentId())
                .quantity(qty)
                .avgCost(executionPrice)
                .build());

        portfolioItemRepository.save(item);
    }

    private void applySell(TradeTransaction transaction, Portfolio portfolio, BigDecimal executionPrice,
                           Optional<PortfolioItem> existingItemOpt, SettlementAmounts settlement) {
        PortfolioItem item = existingItemOpt
                .orElseThrow(() -> new TradeRejectionException("Pozisyon bulunamadı, satış yapılamaz"));

        BigDecimal qty = transaction.getQuantity();
        BigDecimal oldQty = item.getQuantity();

        if (qty.compareTo(oldQty) > 0) {
            // Submit-time check ile burada karşılaşılmamalı; defensive guard.
            throw new TradeRejectionException(
                    "Yetersiz pozisyon. Mevcut: " + oldQty + ", talep: " + qty);
        }

        BigDecimal realizedPnLNative = executionPrice.subtract(item.getAvgCost()).multiply(qty);
        BigDecimal realizedPnLDisplay = convertAmount(
                realizedPnLNative,
                settlement.nativeCurrency(),
                portfolio.getDisplayCurrency()
        ).setScale(AMOUNT_SCALE, RoundingMode.HALF_UP);
        transaction.setRealizedProfitLoss(realizedPnLDisplay);
        log.info("Satış gerçekleşti. tradeId={}, qty={}, executionPrice={}, avgCost={}, realizedPnL={}",
                transaction.getId(), qty, executionPrice, item.getAvgCost(), realizedPnLDisplay);

        BigDecimal newQty = oldQty.subtract(qty);
        if (newQty.compareTo(BigDecimal.ZERO) == 0) {
            log.info("Pozisyon kapatıldı. portfolioId={}, instrumentId={}",
                    transaction.getPortfolioId(), transaction.getInstrumentId());
            portfolioItemRepository.delete(item);
        } else {
            item.setQuantity(newQty);
            portfolioItemRepository.save(item);
        }
    }

    private Portfolio getPortfolio(Long portfolioId) {
        return portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new TradeRejectionException("Portföy bulunamadı"));
    }

    private SettlementAmounts calculateSettlementAmounts(TradeTransaction transaction,
                                                         Portfolio portfolio,
                                                         BigDecimal executionPrice) {
        BigDecimal totalNative = transaction.getQuantity().multiply(executionPrice);
        String nativeCurrency = tradeCurrencyService.resolveNativeCurrency(
                transaction.getInstrumentType(),
                transaction.getInstrumentId()
        );

        BigDecimal totalInPortfolioCurrency = convertAmount(
                totalNative,
                nativeCurrency,
                portfolio.getDisplayCurrency()
        ).setScale(AMOUNT_SCALE, RoundingMode.HALF_UP);

        return new SettlementAmounts(nativeCurrency, totalInPortfolioCurrency);
    }

    private BigDecimal convertAmount(BigDecimal amount, String from, String to) {
        try {
            return tradeCurrencyService.convertOrThrow(amount, from, to);
        } catch (RuntimeException e) {
            throw new TradeRejectionException(e.getMessage());
        }
    }

    private void approve(TradeTransaction transaction, BigDecimal executionPrice) {
        transaction.setStatus(TransactionStatus.APPROVED);
        transaction.setExecutedPrice(executionPrice);
        transaction.setProcessedAt(Instant.now());
        TradeTransaction saved = tradeTransactionRepository.save(transaction);

        Long userId = portfolioRepository.findById(saved.getPortfolioId())
                .map(Portfolio::getUserId)
                .orElse(null);

        log.info("Trade APPROVED. tradeId={}, userId={}, executedPrice={}",
                saved.getId(), userId, executionPrice);
        eventPublisher.publishEvent(TradeApprovedEvent.of(saved, userId));
    }

    private void reject(TradeTransaction transaction, String reason) {
        Long userId = resolvePortfolioUserId(transaction.getPortfolioId());

        transaction.setStatus(TransactionStatus.REJECTED);
        transaction.setRejectionReason(reason);
        transaction.setProcessedAt(Instant.now());
        TradeTransaction saved = tradeTransactionRepository.save(transaction);

        log.warn("Trade REJECTED. tradeId={}, userId={}, reason={}", saved.getId(), userId, reason);
        eventPublisher.publishEvent(TradeRejectedEvent.of(saved, userId, reason));
    }

    private Long resolvePortfolioUserId(Long portfolioId) {
        return portfolioRepository.findById(portfolioId)
                .map(Portfolio::getUserId)
                .orElse(null);
    }

    /**
     * İç kullanım için unchecked exception. Status machine içindeki adımlardan biri patladığında
     * REJECTED akışını tetikler.
     */
    private static class TradeRejectionException extends RuntimeException {
        public TradeRejectionException(String message) {
            super(message);
        }
    }

    private record SettlementAmounts(
            String nativeCurrency,
            BigDecimal totalInPortfolioCurrency
    ) {
    }
}
