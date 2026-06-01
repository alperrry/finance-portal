package com.alper.backend.portfolio.simulation.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionDirection;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.service.InstrumentPriceResolverService;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Bir {@link ManualPosition}'dan simülasyon lens'lerinin (USD, enflasyon, vb.) tüketebileceği
 * {@link ValuationContext} üretir.
 *
 * <p>Enstrüman tipine göre (stock/fund/bond/deposit/viop) cost basis ve güncel/close değer
 * (TRY cinsinden) hesaplanır; tahvil/mevduat için faiz tahakkuku, VIOP için contract
 * multiplier ve LONG/SHORT yönü dikkate alınır.</p>
 */
@Component
@RequiredArgsConstructor
public class ValuationContextBuilder {

    private final InstrumentPriceResolverService priceResolver;

    public ValuationContext fromManualPosition(ManualPosition pos) {
        BigDecimal multiplier = isViop(pos.getInstrumentType()) && pos.getContractMultiplier() != null
                ? pos.getContractMultiplier()
                : BigDecimal.ONE;

        // VIOP maliyet = yatırılan toplam teminat; diğerleri için notional (fiyat × miktar × çarpan)
        BigDecimal costBasisTry = isViop(pos.getInstrumentType()) && pos.getMarginAmount() != null
                ? pos.getMarginAmount()
                : pos.getEntryPrice().multiply(pos.getQuantity()).multiply(multiplier);

        if (pos.getPositionKind() == PositionKind.CLOSED) {
            BigDecimal closeValueTry;
            if (isViop(pos.getInstrumentType())) {
                BigDecimal realizedPnl = pos.getRealizedPnl() != null ? pos.getRealizedPnl() : BigDecimal.ZERO;
                closeValueTry = costBasisTry.add(realizedPnl);
            } else if (isDeposit(pos.getInstrumentType())) {
                closeValueTry = depositValueAt(pos, pos.getExitDate());
            } else {
                closeValueTry = pos.getExitPrice().multiply(pos.getQuantity()).multiply(multiplier);
            }
            return new ValuationContext(
                    pos.getId(),
                    pos.getInstrumentType(),
                    pos.getInstrumentId(),
                    pos.getEntryDate(),
                    costBasisTry,
                    pos.getQuantity(),
                    null,
                    closeValueTry,
                    pos.getExitDate(),
                    true
            );
        }

        if (isDeposit(pos.getInstrumentType())) {
            return new ValuationContext(
                    pos.getId(),
                    pos.getInstrumentType(),
                    pos.getInstrumentId(),
                    pos.getEntryDate(),
                    costBasisTry,
                    pos.getQuantity(),
                    depositValueAt(pos, LocalDate.now()),
                    null,
                    null,
                    false
            );
        }

        if (isBond(pos.getInstrumentType())) {
            return new ValuationContext(
                    pos.getId(),
                    pos.getInstrumentType(),
                    pos.getInstrumentId(),
                    pos.getEntryDate(),
                    costBasisTry,
                    pos.getQuantity(),
                    bondValueAt(pos, LocalDate.now()),
                    null,
                    null,
                    false
            );
        }

        if (isViop(pos.getInstrumentType())) {
            BigDecimal currentPrice = null;
            if (pos.getInstrumentId() != null || pos.getInstrumentSymbol() != null) {
                var info = priceResolver.resolve(pos.getInstrumentType(), pos.getInstrumentId(), pos.getInstrumentSymbol());
                currentPrice = info.currentPrice();
            }
            BigDecimal pnlTry = currentPrice != null ? viopPnl(pos, currentPrice, multiplier) : BigDecimal.ZERO;
            return new ValuationContext(
                    pos.getId(),
                    pos.getInstrumentType(),
                    pos.getInstrumentId(),
                    pos.getEntryDate(),
                    costBasisTry,
                    pos.getQuantity(),
                    costBasisTry.add(pnlTry),
                    null,
                    null,
                    false
            );
        }

        BigDecimal currentPrice = null;
        if (pos.getInstrumentId() != null || pos.getInstrumentSymbol() != null) {
            var info = priceResolver.resolve(pos.getInstrumentType(), pos.getInstrumentId(), pos.getInstrumentSymbol());
            currentPrice = info.currentPrice();
        }
        BigDecimal currentValueTry = currentPrice != null
                ? currentPrice.multiply(pos.getQuantity()).multiply(multiplier)
                : costBasisTry;

        return new ValuationContext(
                pos.getId(),
                pos.getInstrumentType(),
                pos.getInstrumentId(),
                pos.getEntryDate(),
                costBasisTry,
                pos.getQuantity(),
                currentValueTry,
                null,
                null,
                false
        );
    }

    private boolean isViop(InstrumentType type) {
        return type == InstrumentType.VIOP;
    }

    private boolean isDeposit(InstrumentType type) {
        return type == InstrumentType.DEPOSIT;
    }

    private boolean isBond(InstrumentType type) {
        return type == InstrumentType.BOND;
    }

    private BigDecimal viopPnl(ManualPosition pos, BigDecimal currentPrice, BigDecimal multiplier) {
        BigDecimal priceDiff = pos.getDirection() == PositionDirection.LONG
                ? currentPrice.subtract(pos.getEntryPrice())
                : pos.getEntryPrice().subtract(currentPrice);
        return priceDiff.multiply(pos.getQuantity()).multiply(multiplier);
    }

    private BigDecimal bondValueAt(ManualPosition pos, LocalDate requestedDate) {
        BigDecimal principal = pos.getEntryPrice().multiply(pos.getQuantity());
        BigDecimal rate = pos.getInterestRate() != null ? pos.getInterestRate() : BigDecimal.ZERO;
        LocalDate valuationDate = requestedDate != null ? requestedDate : LocalDate.now();
        if (pos.getMaturityDate() != null && valuationDate.isAfter(pos.getMaturityDate())) {
            valuationDate = pos.getMaturityDate();
        }

        long elapsedDays = Math.max(0, ChronoUnit.DAYS.between(pos.getEntryDate(), valuationDate));
        BigDecimal accruedInterest = principal
                .multiply(rate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP))
                .multiply(BigDecimal.valueOf(elapsedDays))
                .divide(BigDecimal.valueOf(365), 10, RoundingMode.HALF_UP);

        return principal.add(accruedInterest);
    }

    private BigDecimal depositValueAt(ManualPosition pos, LocalDate requestedDate) {
        BigDecimal principal = pos.getEntryPrice().multiply(pos.getQuantity());
        BigDecimal rate = pos.getInterestRate() != null ? pos.getInterestRate() : BigDecimal.ZERO;
        LocalDate valuationDate = requestedDate != null ? requestedDate : LocalDate.now();
        if (pos.getMaturityDate() != null && valuationDate.isAfter(pos.getMaturityDate())) {
            valuationDate = pos.getMaturityDate();
        }

        long elapsedDays = Math.max(0, ChronoUnit.DAYS.between(pos.getEntryDate(), valuationDate));
        BigDecimal accruedInterest = principal
                .multiply(rate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP))
                .multiply(BigDecimal.valueOf(elapsedDays))
                .divide(BigDecimal.valueOf(365), 10, RoundingMode.HALF_UP);

        return principal.add(accruedInterest);
    }
}
