package com.alper.backend.portfolio.simulation.lens;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.ValuationContext;

public interface ValuationLens {

    LensType getType();

    LensResult apply(ValuationContext context);

    boolean supports(InstrumentType instrumentType);
}
