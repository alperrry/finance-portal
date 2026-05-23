package com.alper.backend.portfolio.service;

import com.alper.backend.market.fx.event.FxRatesUpdatedEvent;
import com.alper.backend.market.common.event.MarketDataUpdatedEvent;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Set;

@Component
@Log4j2
public class PortfolioValuationCacheInvalidator {

    @Nullable
    @Autowired(required = false)
    private StringRedisTemplate stringRedisTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    @CacheEvict(value = "portfolioValuation", allEntries = true)
    public void onFxRatesUpdated(FxRatesUpdatedEvent event) {
        log.debug("Döviz kurları güncellendi, portföy değerleme cache'i temizlendi. rateCount={}",
                event.rates().size());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    @CacheEvict(value = "portfolioValuation", allEntries = true)
    public void onMarketDataUpdated(MarketDataUpdatedEvent event) {
        log.debug("Piyasa verisi güncellendi, portföy değerleme cache'i temizlendi. module={}, updatedCount={}",
                event.module(), event.updatedCount());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onFxRatesUpdated_EvictSimulationCaches(FxRatesUpdatedEvent event) {
        evictOpenSimulationCaches();
    }

    public void evictOpenSimulationCaches() {
        evictByPattern("sim:item:*");
        evictByPattern("sim:manual:*");
        log.debug("Açık pozisyon simülasyon cache'leri temizlendi.");
    }

    private void evictByPattern(String pattern) {
        if (stringRedisTemplate == null) return;
        Set<String> keys = stringRedisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            stringRedisTemplate.delete(keys);
        }
    }
}
