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
import com.alper.backend.user.service.UserBalanceService;
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
 * Trade lifecycle status machine (jBPM yerine).
 *
 * <p>Yürütülen 4 adım (FR-22):
 * <ol>
 *     <li>Bakiye kontrolü</li>
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
    private final UserBalanceService userBalanceService;
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
        if (transaction.getTransactionType() != TransactionType.BUY) {
            return;
        }
        Portfolio portfolio = getPortfolio(transaction.getPortfolioId());
        SettlementAmounts settlement = calculateSettlementAmounts(transaction, portfolio, executionPrice);
        BigDecimal additionalRequired = settlement.totalInBalanceCurrency().subtract(reservedAmount(transaction));
        if (additionalRequired.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        try {
            userBalanceService.verifySufficientBalance(portfolio.getUserId(), additionalRequired);
        } catch (RuntimeException e) {
            throw new TradeRejectionException(e.getMessage());
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
            return existing;
        }).orElseGet(() -> PortfolioItem.builder()
                .portfolioId(transaction.getPortfolioId())
                .instrumentType(transaction.getInstrumentType())
                .instrumentId(transaction.getInstrumentId())
                .quantity(qty)
                .avgCost(executionPrice)
                .build());

        settleReservedBuyBalance(transaction, portfolio.getUserId(), settlement);
        portfolioItemRepository.save(item);
    }

    private void settleReservedBuyBalance(TradeTransaction transaction, Long userId, SettlementAmounts settlement) {
        BigDecimal reservedAmount = reservedAmount(transaction);
        BigDecimal actualAmount = settlement.totalInBalanceCurrency();
        BigDecimal balanceDelta = reservedAmount.compareTo(BigDecimal.ZERO) > 0
                ? reservedAmount.subtract(actualAmount)
                : actualAmount.negate();

        if (balanceDelta.compareTo(BigDecimal.ZERO) != 0) {
            adjustUserBalance(userId, balanceDelta);
        }
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

        adjustUserBalance(portfolio.getUserId(), settlement.totalInBalanceCurrency());

        BigDecimal newQty = oldQty.subtract(qty);
        if (newQty.compareTo(BigDecimal.ZERO) == 0) {
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
        BigDecimal totalInBalanceCurrency = convertAmount(
                totalNative,
                nativeCurrency,
                TradeCurrencyService.BALANCE_CURRENCY
        ).setScale(AMOUNT_SCALE, RoundingMode.HALF_UP);

        return new SettlementAmounts(nativeCurrency, totalInPortfolioCurrency, totalInBalanceCurrency);
    }

    private BigDecimal convertAmount(BigDecimal amount, String from, String to) {
        try {
            return tradeCurrencyService.convertOrThrow(amount, from, to);
        } catch (RuntimeException e) {
            throw new TradeRejectionException(e.getMessage());
        }
    }

    private void adjustUserBalance(Long userId, BigDecimal delta) {
        try {
            userBalanceService.adjustBalance(userId, delta);
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
        refundReservedBuyBalance(transaction, userId);

        transaction.setStatus(TransactionStatus.REJECTED);
        transaction.setRejectionReason(reason);
        transaction.setProcessedAt(Instant.now());
        TradeTransaction saved = tradeTransactionRepository.save(transaction);

        log.warn("Trade REJECTED. tradeId={}, userId={}, reason={}", saved.getId(), userId, reason);
        eventPublisher.publishEvent(TradeRejectedEvent.of(saved, userId, reason));
    }

    private void refundReservedBuyBalance(TradeTransaction transaction, Long userId) {
        if (userId == null || transaction.getTransactionType() != TransactionType.BUY) {
            return;
        }

        BigDecimal reservedAmount = reservedAmount(transaction);
        if (reservedAmount.compareTo(BigDecimal.ZERO) > 0) {
            adjustUserBalance(userId, reservedAmount);
        }
    }

    private BigDecimal reservedAmount(TradeTransaction transaction) {
        return transaction.getReservedAmount() == null ? BigDecimal.ZERO : transaction.getReservedAmount();
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
            BigDecimal totalInPortfolioCurrency,
            BigDecimal totalInBalanceCurrency
    ) {
    }
}
