package com.alper.backend.portfolio.simulation;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.simulation.lens.ValuationLens;
import com.alper.backend.portfolio.simulation.lens.ValuationLensRegistry;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ValuationLensRegistry")
class ValuationLensRegistryTest {

    private static final ValuationLens STUB_USD_LENS = new ValuationLens() {
        @Override public LensType getType()                      { return LensType.USD; }
        @Override public LensResult apply(ValuationContext ctx)  { return null; }
        @Override public boolean supports(InstrumentType t)      { return true; }
    };

    @Test
    @DisplayName("Kayıtlı lens tipi başarıyla çözümlenir")
    void registeredLens_resolves() {
        ValuationLensRegistry registry = new ValuationLensRegistry(List.of(STUB_USD_LENS));

        ValuationLens resolved = registry.get(LensType.USD);

        assertThat(resolved).isSameAs(STUB_USD_LENS);
    }

    @Test
    @DisplayName("Kayıtsız lens tipi BadRequestException fırlatır (INVALID_PARAMETER)")
    void unregisteredLens_throwsBadRequest() {
        ValuationLensRegistry registry = new ValuationLensRegistry(List.of(STUB_USD_LENS));

        // INFLATION_ADJUSTED not registered
        assertThatThrownBy(() -> registry.get(LensType.INFLATION_ADJUSTED))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> {
                    BadRequestException bre = (BadRequestException) ex;
                    assertThat(bre.getErrorCode().getCode()).isEqualTo("1003_FP_INVALID_PARAMETER");
                });
    }

    @Test
    @DisplayName("Birden fazla lens kaydedildiğinde her biri doğru çözümlenir")
    void multipleLenses_eachResolvesCorrectly() {
        ValuationLens nominalLens = new ValuationLens() {
            @Override public LensType getType()                     { return LensType.NOMINAL_TRY; }
            @Override public LensResult apply(ValuationContext ctx) { return null; }
            @Override public boolean supports(InstrumentType t)     { return true; }
        };

        ValuationLensRegistry registry = new ValuationLensRegistry(List.of(STUB_USD_LENS, nominalLens));

        assertThat(registry.get(LensType.USD)).isSameAs(STUB_USD_LENS);
        assertThat(registry.get(LensType.NOMINAL_TRY)).isSameAs(nominalLens);
    }
}
