import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
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

export function PortfolioMetrics({ portfolio }: Props) {
    const { t } = useTranslation();
    const dailyChange = (portfolio.items ?? []).reduce((sum, item) => {
        const change = toNumber(item.dailyChange);
        return sum + (change === null ? 0 : change * item.quantity);
    }, 0);

    const metrics = [
        {
            label: t("portfolio.metrics.positionValue"),
            value: <AnimatedMoney value={portfolio.totalValue} currency={portfolio.displayCurrency} />,
            note: t("portfolio.metrics.currentMarketValue"),
            tone: "neutral" as const,
        },
        {
            label: "Toplam Maliyet",
            value: <AnimatedMoney value={portfolio.totalCostBasis} currency={portfolio.displayCurrency} />,
            note: "Alış maliyeti",
            tone: "neutral" as const,
        },
        {
            label: "Kâr / Zarar",
            value: (
                <>
                    <AnimatedMoney value={portfolio.totalProfitLoss} currency={portfolio.displayCurrency} />
                    {" "}
                    <span style={{ fontSize: "0.65em", fontWeight: 700 }}>{formatPercent(portfolio.totalProfitLossPct)}</span>
                </>
            ),
            note: "Toplam getiri",
            tone: getProfitTone(portfolio.totalProfitLoss),
        },
        {
            label: "Günlük Değişim",
            value: <>{formatSignedMoney(dailyChange, portfolio.displayCurrency)}</>,
            note: "Bugünkü hareket",
            tone: getProfitTone(dailyChange),
        },
    ];

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 2, mb: 3 }}>
            {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} tone={metric.tone} />
            ))}
        </Box>
    );
}
