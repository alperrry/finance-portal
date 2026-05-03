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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;

/**
 * Trade lifecycle status machine (jBPM yerine).
 *
 * <p>Yürütülen 4 adım (FR-22):
 * <ol>
 *     <li>Bakiye kontrolü (config'e göre disabled olabilir)</li>
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

    @Value("${portfolio.balance-check.enabled:false}")
    private boolean balanceCheckEnabled;

    /**
     * Trade'i verilen gerçekleşme fiyatıyla işle.
     * Tek bir transaction içinde adımları çalıştırır, başarısızlık durumunda REJECTED kaydeder.
     */
    @Transactional
    public void execute(TradeTransaction transaction, BigDecimal executionPrice) {
        log.info("Trade işleniyor. tradeId={}, type={}, executionPrice={}",
                transaction.getId(), transaction.getTransactionType(), executionPrice);

        try {
            checkBalance(transaction, executionPrice);
            checkInstrumentEligibility(transaction);
            checkTradingHours(transaction);
            checkLimits(transaction);

            applyToPortfolio(transaction, executionPrice);
            approve(transaction, executionPrice);
        } catch (TradeRejectionException e) {
            reject(transaction, e.getMessage());
        }
    }

    private void checkBalance(TradeTransaction transaction, BigDecimal executionPrice) {
        if (!balanceCheckEnabled) {
            log.debug("Bakiye kontrolü devre dışı. tradeId={}", transaction.getId());
            return;
        }
        if (transaction.getTransactionType() != TransactionType.BUY) {
            return;
        }
        Portfolio portfolio = portfolioRepository.findById(transaction.getPortfolioId())
                .orElseThrow(() -> new TradeRejectionException("Portföy bulunamadı"));

        BigDecimal totalCost = executionPrice.multiply(transaction.getQuantity());
        if (portfolio.getBalance().compareTo(totalCost) < 0) {
            throw new TradeRejectionException(
                    "Yetersiz bakiye. Mevcut: " + portfolio.getBalance() + ", gereken: " + totalCost);
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
     * Portfolio item ve bakiye güncellemesini Average Cost yöntemiyle yapar.
     */
    private void applyToPortfolio(TradeTransaction transaction, BigDecimal executionPrice) {
        Optional<PortfolioItem> existingItemOpt = portfolioItemRepository
                .findByPortfolioIdAndInstrumentTypeAndInstrumentId(
                        transaction.getPortfolioId(),
                        transaction.getInstrumentType(),
                        transaction.getInstrumentId()
                );

        BigDecimal qty = transaction.getQuantity();
        BigDecimal totalAmount = qty.multiply(executionPrice).setScale(AMOUNT_SCALE, RoundingMode.HALF_UP);
        transaction.setTotalAmount(totalAmount);

        if (transaction.getTransactionType() == TransactionType.BUY) {
            applyBuy(transaction, executionPrice, existingItemOpt, totalAmount);
        } else {
            applySell(transaction, executionPrice, existingItemOpt, totalAmount);
        }
    }

    private void applyBuy(TradeTransaction transaction, BigDecimal executionPrice,
                          Optional<PortfolioItem> existingItemOpt, BigDecimal totalAmount) {
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
            return existing;
        }).orElseGet(() -> PortfolioItem.builder()
                .portfolioId(transaction.getPortfolioId())
                .instrumentType(transaction.getInstrumentType())
                .instrumentId(transaction.getInstrumentId())
                .quantity(qty)
                .avgCost(executionPrice)
                .build());

        portfolioItemRepository.save(item);

        // Sanal bakiye disabled olsa bile DB'de tutarlı kalsın diye düşürüyoruz.
        adjustPortfolioBalance(transaction.getPortfolioId(), totalAmount.negate());
    }

    private void applySell(TradeTransaction transaction, BigDecimal executionPrice,
                           Optional<PortfolioItem> existingItemOpt, BigDecimal totalAmount) {
        PortfolioItem item = existingItemOpt
                .orElseThrow(() -> new TradeRejectionException("Pozisyon bulunamadı, satış yapılamaz"));

        BigDecimal qty = transaction.getQuantity();
        BigDecimal oldQty = item.getQuantity();

        if (qty.compareTo(oldQty) > 0) {
            // Submit-time check ile burada karşılaşılmamalı; defensive guard.
            throw new TradeRejectionException(
                    "Yetersiz pozisyon. Mevcut: " + oldQty + ", talep: " + qty);
        }

        BigDecimal realizedPnL = executionPrice.subtract(item.getAvgCost())
                .multiply(qty)
                .setScale(AMOUNT_SCALE, RoundingMode.HALF_UP);
        transaction.setRealizedProfitLoss(realizedPnL);

        BigDecimal newQty = oldQty.subtract(qty);
        if (newQty.compareTo(BigDecimal.ZERO) == 0) {
            portfolioItemRepository.delete(item);
        } else {
            item.setQuantity(newQty);
            portfolioItemRepository.save(item);
        }

        adjustPortfolioBalance(transaction.getPortfolioId(), totalAmount);
    }

    private void adjustPortfolioBalance(Long portfolioId, BigDecimal delta) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new TradeRejectionException("Portföy bulunamadı"));
        portfolio.setBalance(portfolio.getBalance().add(delta));
        portfolioRepository.save(portfolio);
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
        transaction.setStatus(TransactionStatus.REJECTED);
        transaction.setRejectionReason(reason);
        transaction.setProcessedAt(Instant.now());
        TradeTransaction saved = tradeTransactionRepository.save(transaction);

        Long userId = portfolioRepository.findById(saved.getPortfolioId())
                .map(Portfolio::getUserId)
                .orElse(null);

        log.warn("Trade REJECTED. tradeId={}, userId={}, reason={}", saved.getId(), userId, reason);
        eventPublisher.publishEvent(TradeRejectedEvent.of(saved, userId, reason));
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
}