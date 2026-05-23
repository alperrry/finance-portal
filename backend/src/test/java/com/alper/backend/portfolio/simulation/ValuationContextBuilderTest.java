package com.alper.backend.portfolio.simulation;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.service.InstrumentPriceResolverService;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
import com.alper.backend.portfolio.simulation.service.ValuationContextBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ValuationContextBuilder")
class ValuationContextBuilderTest {

    @Mock private InstrumentPriceResolverService priceResolver;

    private ValuationContextBuilder builder;

    private static final LocalDate ENTRY_DATE  = LocalDate.of(2025, 3, 10);
    private static final LocalDate EXIT_DATE   = LocalDate.of(2026, 1, 5);
    private static final BigDecimal QTY        = new BigDecimal("100");
    private static final BigDecimal ENTRY_PRICE = new BigDecimal("45.00");
    private static final BigDecimal EXIT_PRICE  = new BigDecimal("60.00");

    @BeforeEach
    void setUp() {
        builder = new ValuationContextBuilder(priceResolver);
    }

    @Test
    @DisplayName("Açık ManualPosition → entryDate, costBasisTry, currentValueTry doğru hesaplanır")
    void openManualPosition_fieldsMapCorrectly() {
        ManualPosition pos = ManualPosition.builder()
                .id(5L)
                .portfolioId(1L)
                .instrumentType(InstrumentType.STOCK)
                .positionKind(PositionKind.OPEN)
                .instrumentId(10L)
                .quantity(QTY)
                .entryPrice(ENTRY_PRICE)
                .entryDate(ENTRY_DATE)
                .build();

        when(priceResolver.resolve(InstrumentType.STOCK, 10L, null))
                .thenReturn(new InstrumentPriceResolverService.InstrumentInfo(
                        "AKBNK.IS", "Akbank", "TRY", new BigDecimal("55.00")));

        ValuationContext ctx = builder.fromManualPosition(pos);

        assertThat(ctx.closed()).isFalse();
        assertThat(ctx.purchaseDate()).isEqualTo(ENTRY_DATE);
        assertThat(ctx.costBasisTry()).isEqualByComparingTo(new BigDecimal("4500.00")); // 45 * 100
        assertThat(ctx.currentValueTry()).isEqualByComparingTo(new BigDecimal("5500.00")); // 55 * 100
        assertThat(ctx.closeValueTry()).isNull();
        assertThat(ctx.closeDate()).isNull();
    }

    @Test
    @DisplayName("Kapalı ManualPosition → closed=true, exitDate, closeValueTry doğru")
    void closedManualPosition_fieldsMapCorrectly() {
        ManualPosition pos = ManualPosition.builder()
                .id(7L)
                .portfolioId(1L)
                .instrumentType(InstrumentType.STOCK)
                .positionKind(PositionKind.CLOSED)
                .instrumentId(10L)
                .quantity(QTY)
                .entryPrice(ENTRY_PRICE)
                .entryDate(ENTRY_DATE)
                .exitPrice(EXIT_PRICE)
                .exitDate(EXIT_DATE)
                .build();

        ValuationContext ctx = builder.fromManualPosition(pos);

        assertThat(ctx.closed()).isTrue();
        assertThat(ctx.purchaseDate()).isEqualTo(ENTRY_DATE);
        assertThat(ctx.costBasisTry()).isEqualByComparingTo(new BigDecimal("4500.00")); // 45 * 100
        assertThat(ctx.closeValueTry()).isEqualByComparingTo(new BigDecimal("6000.00")); // 60 * 100
        assertThat(ctx.closeDate()).isEqualTo(EXIT_DATE);
        assertThat(ctx.currentValueTry()).isNull();
    }

    @Test
    @DisplayName("Açık DEPOSIT → bugünkü değer vade sonunu aşmadan birikmiş faizle hesaplanır")
    void openDeposit_accruesInterestUntilMaturity() {
        ManualPosition pos = ManualPosition.builder()
                .id(8L)
                .portfolioId(1L)
                .instrumentType(InstrumentType.DEPOSIT)
                .positionKind(PositionKind.OPEN)
                .quantity(new BigDecimal("100000.00"))
                .entryPrice(BigDecimal.ONE)
                .entryDate(LocalDate.of(2026, 1, 1))
                .maturityDate(LocalDate.of(2026, 1, 31))
                .interestRate(new BigDecimal("36.00"))
                .build();

        ValuationContext ctx = builder.fromManualPosition(pos);

        assertThat(ctx.closed()).isFalse();
        assertThat(ctx.costBasisTry()).isEqualByComparingTo(new BigDecimal("100000.00"));
        assertThat(ctx.currentValueTry()).isEqualByComparingTo(new BigDecimal("102958.9041095890"));
    }

    @Test
    @DisplayName("Kapalı DEPOSIT → kapanış değerinde çıkış tarihine kadar birikmiş faiz kullanılır")
    void closedDeposit_accruesInterestUntilExitDate() {
        ManualPosition pos = ManualPosition.builder()
                .id(9L)
                .portfolioId(1L)
                .instrumentType(InstrumentType.DEPOSIT)
                .positionKind(PositionKind.CLOSED)
                .quantity(new BigDecimal("100000.00"))
                .entryPrice(BigDecimal.ONE)
                .entryDate(LocalDate.of(2026, 1, 1))
                .exitPrice(BigDecimal.ONE)
                .exitDate(LocalDate.of(2026, 1, 11))
                .maturityDate(LocalDate.of(2026, 1, 31))
                .interestRate(new BigDecimal("36.00"))
                .build();

        ValuationContext ctx = builder.fromManualPosition(pos);

        assertThat(ctx.closed()).isTrue();
        assertThat(ctx.costBasisTry()).isEqualByComparingTo(new BigDecimal("100000.00"));
        assertThat(ctx.closeValueTry()).isEqualByComparingTo(new BigDecimal("100986.3013698630"));
        assertThat(ctx.closeDate()).isEqualTo(LocalDate.of(2026, 1, 11));
    }

    @Test
    @DisplayName("Açık CURRENCY → güncel TRY değer fiyat resolver'dan gelen TCMB kuruyla hesaplanır")
    void openCurrency_fieldsMapCorrectly() {
        ManualPosition pos = ManualPosition.builder()
                .id(10L)
                .portfolioId(1L)
                .instrumentType(InstrumentType.CURRENCY)
                .positionKind(PositionKind.OPEN)
                .instrumentId(20L)
                .instrumentSymbol("EUR")
                .quantity(new BigDecimal("1000.00"))
                .entryPrice(new BigDecimal("35.00"))
                .entryDate(ENTRY_DATE)
                .build();

        when(priceResolver.resolve(InstrumentType.CURRENCY, 20L, "EUR"))
                .thenReturn(new InstrumentPriceResolverService.InstrumentInfo(
                        "EUR", "Euro", "TRY", new BigDecimal("40.00")));

        ValuationContext ctx = builder.fromManualPosition(pos);

        assertThat(ctx.costBasisTry()).isEqualByComparingTo(new BigDecimal("35000.0000"));
        assertThat(ctx.currentValueTry()).isEqualByComparingTo(new BigDecimal("40000.0000"));
    }

}
