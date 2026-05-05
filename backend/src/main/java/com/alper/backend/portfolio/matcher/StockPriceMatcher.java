package com.alper.backend.portfolio.matcher;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.portfolio.model.OrderType;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * STOCK enstrümanları için fiyat eşleştirici.
 * Güncel fiyat (price) stock_price_snapshot tablosundan alınır.
 *
 * <p>NOT: StockPriceSnapshotRepository'de aşağıdaki metodun bulunması gerekir:
 * <pre>Optional<StockPriceSnapshot> findFirstByStockIdOrderByFetchedAtDesc(Long stockId);</pre>
 * </p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class StockPriceMatcher implements PriceMatcher {

    private final StockPriceSnapshotRepository snapshotRepository;

    @Override
    public InstrumentType getSupportedType() {
        return InstrumentType.STOCK;
    }

    @Override
    public Optional<BigDecimal> match(TradeTransaction transaction) {
        Optional<StockPriceSnapshot> snapshotOpt = snapshotRepository
                .findFirstByStockIdOrderByFetchedAtDesc(transaction.getInstrumentId());

        if (snapshotOpt.isEmpty()) {
            log.warn("Stock fiyat snapshot bulunamadı, eşleştirme atlandı. tradeId={}, instrumentId={}",
                    transaction.getId(), transaction.getInstrumentId());
            return Optional.empty();
        }

        BigDecimal currentPrice = snapshotOpt.get().getPrice();
        return matchPrice(transaction, currentPrice);
    }

    private Optional<BigDecimal> matchPrice(TradeTransaction transaction, BigDecimal currentPrice) {
        if (transaction.getOrderType() == OrderType.MARKET) {
            return Optional.of(currentPrice);
        }

        BigDecimal targetPrice = transaction.getTargetPrice();
        if (targetPrice == null) {
            log.warn("LIMIT stock trade targetPrice null, eşleştirme atlandı. tradeId={}", transaction.getId());
            return Optional.empty();
        }
        TransactionType type = transaction.getTransactionType();

        boolean matched = (type == TransactionType.BUY && currentPrice.compareTo(targetPrice) <= 0)
                || (type == TransactionType.SELL && currentPrice.compareTo(targetPrice) >= 0);

        if (matched) {
            log.debug("Stock eşleşmesi tetiklendi. tradeId={}, type={}, currentPrice={}, targetPrice={}",
                    transaction.getId(), type, currentPrice, targetPrice);
            return Optional.of(currentPrice);
        }

        return Optional.empty();
    }
}
