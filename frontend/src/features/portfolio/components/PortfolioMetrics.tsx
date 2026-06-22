import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ManualPositionResponse, PortfolioResponse } from "../api/portfolioApi";
import { MetricCard } from "../../../components/ui/MetricCard";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { formatMoney, formatPercent, formatSignedMoney, getProfitTone, toNumber } from "../utils/portfolioFormatters";

function AnimatedMoney({ value, currency, digits = 2 }: { value: number | null | undefined; currency: string; digits?: number }) {
    return <>{formatMoney(useAnimatedNumber(value), currency, digits)}</>;
}

// Kâr/zarar değeri: yön oku (▲/▼) + belirgin yeşil/kırmızı renk ile.
function PnlValue({ amount, currency, hasData = true }: { amount: number | null | undefined; currency: string; hasData?: boolean }) {
    const animated = useAnimatedNumber(amount);
    if (!hasData || amount == null) {
        return <Box component="span" sx={{ color: "text.disabled" }}>—</Box>;
    }
    const tone = getProfitTone(amount);
    const color = tone === "up" ? "success.main" : tone === "down" ? "error.main" : "text.primary";
    const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : "";
    return (
        <Box component="span" sx={{ color, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            {arrow ? <Box component="span" sx={{ fontSize: "0.7em" }}>{arrow}</Box> : null}
            {formatSignedMoney(animated, currency)}
        </Box>
    );
}

type Props = {
    portfolio: PortfolioResponse;
    closedPositions: ManualPositionResponse[];
};

export function PortfolioMetrics({ portfolio, closedPositions }: Props) {
    const { t } = useTranslation();
    const currency = portfolio.displayCurrency;

    const realizedPnl = closedPositions.reduce((sum, pos) => {
        const value = toNumber(pos.realizedPnl);
        return sum + (value ?? 0);
    }, 0);
    const hasClosed = closedPositions.length > 0;

    const metrics = [
        {
            label: t("portfolio.metrics.positionValue"),
            value: <AnimatedMoney value={portfolio.totalValue} currency={currency} />,
            note: t("portfolio.metrics.currentMarketValue"),
            tone: "neutral" as const,
            delta: undefined as string | undefined,
        },
        {
            label: t("portfolio.metrics.costBasis"),
            value: <AnimatedMoney value={portfolio.totalCostBasis} currency={currency} />,
            note: t("portfolio.metrics.costBasisNote"),
            tone: "neutral" as const,
            delta: undefined as string | undefined,
        },
        {
            label: t("portfolio.metrics.unrealizedPnl"),
            value: <PnlValue amount={portfolio.totalProfitLoss} currency={currency} />,
            note: t("portfolio.metrics.unrealizedPnlNote"),
            tone: getProfitTone(portfolio.totalProfitLoss),
            delta: portfolio.totalProfitLossPct != null ? formatPercent(portfolio.totalProfitLossPct) : undefined,
        },
        {
            label: t("portfolio.metrics.realizedPnl"),
            value: <PnlValue amount={hasClosed ? realizedPnl : null} currency={currency} hasData={hasClosed} />,
            note: t("portfolio.metrics.realizedPnlNote"),
            tone: hasClosed ? getProfitTone(realizedPnl) : "neutral",
            delta: undefined as string | undefined,
        },
    ];

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 2, mb: 3 }}>
            {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} tone={metric.tone} delta={metric.delta} />
            ))}
        </Box>
    );
}
