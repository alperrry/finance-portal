import { Box } from "@mui/material";
import type { PortfolioResponse } from "../api/portfolioApi";
import { MetricCard } from "../../../components/ui/MetricCard";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { formatMoney, formatPercent, formatSignedMoney, getProfitTone, toNumber } from "../utils/portfolioFormatters";

function AnimatedMoney({ value, currency, digits = 2 }: { value: number | null | undefined; currency: string; digits?: number }) {
    return <>{formatMoney(useAnimatedNumber(value), currency, digits)}</>;
}

type Props = {
    portfolio: PortfolioResponse;
};

const toMetricTone = (tone: "up" | "down" | "neutral"): "up" | "down" | "neutral" => tone;

export function PortfolioMetrics({ portfolio }: Props) {
    const dailyChange = (portfolio.items ?? []).reduce((sum, item) => {
        const change = toNumber(item.dailyChange);
        return sum + (change === null ? 0 : change * item.quantity);
    }, 0);

    const metrics = [
        {
            label: "Pozisyon Değeri",
            value: <AnimatedMoney value={portfolio.totalValue} currency={portfolio.displayCurrency} />,
            note: "Bu portföy",
            tone: "neutral" as const,
        },
        {
            label: "Kâr/Zarar",
            value: (
                <>
                    <AnimatedMoney value={portfolio.totalProfitLoss} currency={portfolio.displayCurrency} />
                    {" "}
                    <span style={{ fontSize: "0.65em", fontWeight: 700 }}>{formatPercent(portfolio.totalProfitLossPct)}</span>
                </>
            ),
            note: `${formatSignedMoney(dailyChange, portfolio.displayCurrency)} bugün`,
            tone: toMetricTone(getProfitTone(portfolio.totalProfitLoss)),
        },
    ];

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2, mb: 2 }}>
            {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} tone={metric.tone} />
            ))}
        </Box>
    );
}
