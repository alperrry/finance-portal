package com.alper.backend.portfolio.service;

import com.alper.backend.market.fx.event.FxRatesUpdatedEvent;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@Log4j2
public class PortfolioValuationCacheInvalidator {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    @CacheEvict(value = "portfolioValuation", allEntries = true)
    public void onFxRatesUpdated(FxRatesUpdatedEvent event) {
        log.debug("Döviz kurları güncellendi, portföy değerleme cache'i temizlendi. rateCount={}",
                event.rates().size());
    }
}
