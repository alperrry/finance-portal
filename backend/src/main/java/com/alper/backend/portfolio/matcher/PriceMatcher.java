package com.alper.backend.portfolio.matcher;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.TradeTransaction;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Strategy pattern: her enstrüman tipi için fiyat eşleştirme stratejisi.
 *
 * <p>Bu basitleştirilmiş yaklaşımda yalnızca güncel fiyat (currentPrice) baz alınır.
 * BUY için currentPrice <= targetPrice, SELL için currentPrice >= targetPrice koşulu sağlanırsa
 * eşleştirme tetiklenir ve gerçekleşme fiyatı olarak currentPrice kullanılır.</p>
 */
public interface PriceMatcher {

    /**
     * Bu matcher'ın desteklediği enstrüman tipi.
     * TradeMatchingService Map<InstrumentType, PriceMatcher> oluşturmak için kullanır.
     */
    InstrumentType getSupportedType();

    /**
     * Trade için fiyat eşleştirmesi yap.
     *
     * @param transaction PENDING durumdaki trade
     * @return Eşleşme varsa gerçekleşme fiyatı, yoksa Optional.empty()
     */
    Optional<BigDecimal> match(TradeTransaction transaction);
}