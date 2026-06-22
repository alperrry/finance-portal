package com.alper.backend.portfolio.pnl;

import com.alper.backend.common.model.InstrumentType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Enstrüman türünü uygun {@link PnlCalculator} uygulamasına eşleyen kayıt (registry).
 *
 * <p>Hisse, fon, döviz ve tahvil standart hesaplayıcıyı kullanır; VİOP ve mevduat
 * kendi hesaplayıcılarına sahiptir.</p>
 */
@Component
public class PnlCalculatorRegistry {

    private final Map<InstrumentType, PnlCalculator> calculators;

    public PnlCalculatorRegistry() {
        StandardPnlCalculator standard = new StandardPnlCalculator();
        this.calculators = new EnumMap<>(InstrumentType.class);
        calculators.put(InstrumentType.STOCK, standard);
        calculators.put(InstrumentType.FUND, standard);
        calculators.put(InstrumentType.CURRENCY, standard);
        calculators.put(InstrumentType.BOND, standard);
        calculators.put(InstrumentType.VIOP, new ViopPnlCalculator());
        calculators.put(InstrumentType.DEPOSIT, new DepositPnlCalculator());
    }

    /**
     * Enstrüman türüne uygun hesaplayıcıyı döndürür; eşleşme yoksa standart
     * hesaplayıcıya düşer.
     *
     * @param type enstrüman türü
     * @return ilgili PnL hesaplayıcısı
     */
    public PnlCalculator get(InstrumentType type) {
        return calculators.getOrDefault(type, new StandardPnlCalculator());
    }
}
