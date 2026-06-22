package com.alper.backend.portfolio.service;

import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.pnl.PnlCalculatorRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Açık (OPEN) manuel pozisyonların güncel fiyat / değer / gerçekleşmemiş P/L hesabını
 * tek bir yerde toplayan yardımcı bileşen.
 *
 * <p>Hem {@link ManualPositionService} (tekil pozisyon yanıtı) hem de
 * {@link PortfolioValuationService} (portföy toplamı) bu sınıfı kullanır; böylece
 * fiyat çözümleme ve P/L mantığı tek kaynakta tutulur.</p>
 */
@Component
@RequiredArgsConstructor
public class ManualPositionValuator {

    private static final int RESULT_SCALE = 2;

    private final InstrumentPriceResolverService priceResolver;
    private final PnlCalculatorRegistry pnlRegistry;

    /**
     * Tek bir açık pozisyonun güncel fiyatını ve gerçekleşmemiş P/L'sini çözer.
     * Pozisyon kapalıysa veya fiyat bulunamazsa ilgili alanlar null döner.
     */
    public OpenValuation valuateOpen(ManualPosition position) {
        if (position.getPositionKind() != PositionKind.OPEN
                || (position.getInstrumentId() == null && position.getInstrumentSymbol() == null)) {
            return new OpenValuation(null, null);
        }

        var info = priceResolver.resolve(
                position.getInstrumentType(), position.getInstrumentId(), position.getInstrumentSymbol());
        BigDecimal currentPrice = info.currentPrice();
        if (currentPrice == null) {
            return new OpenValuation(null, null);
        }

        BigDecimal unrealizedPnl = pnlRegistry.get(position.getInstrumentType()).calculate(position, currentPrice);
        return new OpenValuation(currentPrice, unrealizedPnl);
    }

    /**
     * Verilen açık pozisyon listesini portföy düzeyinde toplar.
     *
     * <ul>
     *     <li>totalCostBasis = Σ (entryPrice · quantity · contractMultiplier)</li>
     *     <li>totalProfitLoss = Σ unrealizedPnl (yön/çarpanı PnlCalculator dikkate alır)</li>
     *     <li>totalValue = totalCostBasis + totalProfitLoss</li>
     * </ul>
     */
    public OpenAggregate aggregateOpen(List<ManualPosition> openPositions) {
        BigDecimal totalCostBasis = BigDecimal.ZERO;
        BigDecimal totalProfitLoss = BigDecimal.ZERO;
        int count = 0;

        for (ManualPosition position : openPositions) {
            if (position.getPositionKind() != PositionKind.OPEN) {
                continue;
            }
            count++;

            BigDecimal multiplier = position.getContractMultiplier() != null
                    ? position.getContractMultiplier() : BigDecimal.ONE;
            BigDecimal costBasis = position.getEntryPrice()
                    .multiply(position.getQuantity())
                    .multiply(multiplier);
            totalCostBasis = totalCostBasis.add(costBasis);

            BigDecimal unrealizedPnl = valuateOpen(position).unrealizedPnl();
            if (unrealizedPnl != null) {
                totalProfitLoss = totalProfitLoss.add(unrealizedPnl);
            }
        }

        BigDecimal totalValue = totalCostBasis.add(totalProfitLoss);
        BigDecimal pct = totalCostBasis.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalProfitLoss.multiply(BigDecimal.valueOf(100))
                        .divide(totalCostBasis, RESULT_SCALE, RoundingMode.HALF_UP);

        return new OpenAggregate(
                totalValue.setScale(RESULT_SCALE, RoundingMode.HALF_UP),
                totalCostBasis.setScale(RESULT_SCALE, RoundingMode.HALF_UP),
                totalProfitLoss.setScale(RESULT_SCALE, RoundingMode.HALF_UP),
                pct,
                count);
    }

    /** Tekil açık pozisyon değerleme sonucu. */
    public record OpenValuation(BigDecimal currentPrice, BigDecimal unrealizedPnl) {}

    /** Portföy düzeyinde açık pozisyon toplamı. */
    public record OpenAggregate(
            BigDecimal totalValue,
            BigDecimal totalCostBasis,
            BigDecimal totalProfitLoss,
            BigDecimal totalProfitLossPct,
            int openPositionCount
    ) {}
}
