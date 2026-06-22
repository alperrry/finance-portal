package com.alper.backend.portfolio.simulation.lens;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.portfolio.simulation.model.LensType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Lens tipini ilgili {@link ValuationLens} uygulamasına eşleyen kayıt (registry).
 *
 * <p>Spring context'indeki tüm lens bileşenleri constructor üzerinden toplanır.</p>
 */
@Component
public class ValuationLensRegistry {

    private final Map<LensType, ValuationLens> registry;

    public ValuationLensRegistry(List<ValuationLens> lenses) {
        this.registry = new EnumMap<>(LensType.class);
        lenses.forEach(l -> registry.put(l.getType(), l));
    }

    /**
     * Verilen tipe kayıtlı lensi döndürür.
     *
     * @param type lens tipi
     * @return ilgili lens
     * @throws BadRequestException tip için kayıtlı lens yoksa
     */
    public ValuationLens get(LensType type) {
        ValuationLens lens = registry.get(type);
        if (lens == null) {
            throw new BadRequestException(ErrorCode.INVALID_PARAMETER,
                    "Bilinmeyen lens tipi: " + type);
        }
        return lens;
    }
}
