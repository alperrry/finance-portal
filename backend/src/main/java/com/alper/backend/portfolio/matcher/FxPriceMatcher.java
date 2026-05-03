package com.alper.backend.portfolio.matcher;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * FX enstrümanları için fiyat eşleştirici.
 * Güncel kur exchange_rate tablosundan en son rate_date kaydı alınarak belirlenir.
 * Fiyat olarak forex_buying değeri kullanılır (konservatif).
 *
 * <p>NOT: ExchangeRateRepository'de aşağıdaki metodun bulunması gerekir:
 * <pre>Optional<ExchangeRate> findFirstByIdOrderByRateDateDesc(Long id);</pre>
 *
 * Tasarımda FX enstrümanı portföye eklenirken instrumentId olarak exchange_rate.id değil,
 * currency_code'a karşılık gelen sabit bir id kullanılması daha uygundur. Bu durumda
 * <pre>Optional<ExchangeRate> findFirstByCurrencyCodeOrderByRateDateDesc(String currencyCode);</pre>
 * metodu da gerekebilir; tercih edilen yaklaşıma göre PortfolioValuationService ile
 * birlikte düşünülmelidir.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class FxPriceMatcher implements PriceMatcher {

    private final ExchangeRateRepository exchangeRateRepository;

    @Override
    public InstrumentType getSupportedType() {
        return InstrumentType.CURRENCY;
    }

    @Override
    public Optional<BigDecimal> match(TradeTransaction transaction) {
        Optional<ExchangeRate> rateOpt = exchangeRateRepository
                .findFirstByIdOrderByRateDateDesc(transaction.getInstrumentId());

        if (rateOpt.isEmpty()) {
            log.warn("Döviz kuru bulunamadı, eşleştirme atlandı. tradeId={}, instrumentId={}",
                    transaction.getId(), transaction.getInstrumentId());
            return Optional.empty();
        }

        BigDecimal currentPrice = rateOpt.get().getForexBuying();
        if (currentPrice == null) {
            log.warn("Döviz kuru forex_buying değeri null, eşleştirme atlandı. tradeId={}", transaction.getId());
            return Optional.empty();
        }

        BigDecimal targetPrice = transaction.getTargetPrice();
        TransactionType type = transaction.getTransactionType();

        boolean matched = (type == TransactionType.BUY && currentPrice.compareTo(targetPrice) <= 0)
                || (type == TransactionType.SELL && currentPrice.compareTo(targetPrice) >= 0);

        if (matched) {
            log.debug("FX eşleşmesi tetiklendi. tradeId={}, type={}, currentPrice={}, targetPrice={}",
                    transaction.getId(), type, currentPrice, targetPrice);
            return Optional.of(currentPrice);
        }

        return Optional.empty();
    }
}