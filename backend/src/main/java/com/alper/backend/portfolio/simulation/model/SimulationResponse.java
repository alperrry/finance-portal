package com.alper.backend.portfolio.simulation.model;

import java.util.Map;

/**
 * Pozisyon simülasyonunun API yanıtı.
 *
 * @param summary  pozisyon özeti
 * @param baseline nominal TL bazlı temel değerleme
 * @param lenses   istenen lenslerin tipine göre sonuçları
 */
public record SimulationResponse(
        PositionSummary summary,
        LensResult baseline,
        Map<LensType, LensResult> lenses
) {}
