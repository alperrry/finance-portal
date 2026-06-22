package com.alper.backend.portfolio.simulation.lens;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.ValuationContext;

/**
 * Bir pozisyonu farklı bir bakış açısıyla (USD bazlı, enflasyon düzeltmeli vb.)
 * yeniden değerleyen "lens" strateji arayüzü.
 *
 * <p>Uygulamalar Spring bileşeni olarak tanımlanır ve
 * {@link ValuationLensRegistry} tarafından tipine göre seçilir.</p>
 */
public interface ValuationLens {

    /** @return lensin tipi */
    LensType getType();

    /**
     * Pozisyonu bu lensin bakış açısıyla değerler.
     *
     * @param context pozisyonun değerleme bağlamı
     * @return lens sonucu olarak hesaplanan maliyet, değer ve kar/zarar
     */
    LensResult apply(ValuationContext context);

    /**
     * Lensin verilen enstrüman türünü destekleyip desteklemediğini bildirir.
     *
     * @param instrumentType kontrol edilecek enstrüman türü
     * @return destekleniyorsa {@code true}
     */
    boolean supports(InstrumentType instrumentType);
}
