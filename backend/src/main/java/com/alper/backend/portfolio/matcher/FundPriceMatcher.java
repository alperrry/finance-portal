package com.alper.backend.portfolio.matcher;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.portfolio.model.OrderType;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * FUND enstrümanları için fiyat eşleştirici.
 * Güncel birim pay değeri fund_price tablosundan en son price_date kaydı alınarak belirlenir.
 *
 * <p>NOT: FundPriceRepository'de aşağıdaki metodun bulunması gerekir:
 * <pre>Optional<FundPrice> findFirstByFundIdOrderByPriceDateDesc(Long fundId);</pre>
 * </p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class FundPriceMatcher implements PriceMatcher {

    private final FundPriceRepository fundPriceRepository;

    @Override
    public InstrumentType getSupportedType() {
        return InstrumentType.FUND;
    }

    @Override
    public Optional<BigDecimal> match(TradeTransaction transaction) {
        Optional<FundPrice> priceOpt = fundPriceRepository
                .findFirstByFundIdOrderByPriceDateDesc(transaction.getInstrumentId());

        if (priceOpt.isEmpty()) {
            log.warn("Fon fiyatı bulunamadı, eşleştirme atlandı. tradeId={}, instrumentId={}",
                    transaction.getId(), transaction.getInstrumentId());
            return Optional.empty();
        }

        BigDecimal currentPrice = priceOpt.get().getPrice();
        if (transaction.getOrderType() == OrderType.MARKET) {
            return Optional.of(currentPrice);
        }

        BigDecimal targetPrice = transaction.getTargetPrice();
        if (targetPrice == null) {
            log.warn("LIMIT fon trade targetPrice null, eşleştirme atlandı. tradeId={}", transaction.getId());
            return Optional.empty();
        }
        TransactionType type = transaction.getTransactionType();

        boolean matched = (type == TransactionType.BUY && currentPrice.compareTo(targetPrice) <= 0)
                || (type == TransactionType.SELL && currentPrice.compareTo(targetPrice) >= 0);

        if (matched) {
            log.debug("Fon eşleşmesi tetiklendi. tradeId={}, type={}, currentPrice={}, targetPrice={}",
                    transaction.getId(), type, currentPrice, targetPrice);
            return Optional.of(targetPrice);
        }

        return Optional.empty();
    }
}
