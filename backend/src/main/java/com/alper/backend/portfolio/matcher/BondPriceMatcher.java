package com.alper.backend.portfolio.matcher;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.TradeTransaction;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * BOND enstrümanları için fiyat eşleştirici (placeholder).
 *
 * <p>Tasarım kararı: Bond işlemleri "market order" olarak ele alınır ve TradeService.submitTrade
 * içinde anında APPROVED durumuna geçirilir, scheduler'a (PENDING) hiç düşmez.
 * Dolayısıyla bu matcher pratikte hiçbir trade ile karşılaşmaz; defensive programming
 * için interface'i implement eder ve her zaman empty döner.</p>
 *
 * <p>Eğer gelecekte bond için limit order desteği eklenirse, bond_rate_history.interest_rate
 * üzerinden ya da nominal değer / sentetik fiyat türetimi ile gerçek bir eşleştirme yazılabilir.</p>
 */
@Component
@Log4j2
public class BondPriceMatcher implements PriceMatcher {

    @Override
    public InstrumentType getSupportedType() {
        return InstrumentType.BOND;
    }

    @Override
    public Optional<BigDecimal> match(TradeTransaction transaction) {
        log.warn("BondPriceMatcher.match çağrıldı, fakat bond işlemleri PENDING'e düşmemeli. " +
                "Bu trade muhtemelen hatalı kaydedildi. tradeId={}", transaction.getId());
        return Optional.empty();
    }
}