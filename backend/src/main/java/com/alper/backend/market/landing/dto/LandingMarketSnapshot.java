package com.alper.backend.market.landing.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ana sayfa piyasa özetindeki tüm enstrümanların anlık görüntüsünü döndürür.
 */
@Getter
@Builder
public class LandingMarketSnapshot {

    private List<LandingMarketItem> heroItems;
    private List<LandingMarketItem> marketItems;
    private LocalDateTime generatedAt;
}
