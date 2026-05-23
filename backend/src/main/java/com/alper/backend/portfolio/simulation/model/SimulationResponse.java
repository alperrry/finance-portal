package com.alper.backend.portfolio.simulation.model;

import java.util.Map;

public record SimulationResponse(
        PositionSummary summary,
        LensResult baseline,
        Map<LensType, LensResult> lenses
) {}
