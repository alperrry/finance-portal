import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ManualPositionResponse } from "../api/portfolioApi";
import { buildTypeGroupData, formatMoney, formatPercent, formatSignedMoney } from "../utils/portfolioFormatters";

type ChartTooltipProps = {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number; payload?: { fill?: string } }>;
    total: number;
    currency: string;
};

// 1. JİLET GİBİ TOOLTIP (Gölgeli, Noktalı ve Hizalı)
function ChartTooltip({ active, payload, total, currency }: ChartTooltipProps) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const value = Number(item.value ?? 0);
    const pct = total > 0 ? (value / total) * 100 : 0;
    const color = item.payload?.fill || "primary.main";

    return (
        <Paper elevation={4} sx={{ p: 2, minWidth: 180, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
            </Stack>
            <Stack sx={{ gap: 0.75 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                    <Typography variant="caption" color="text.secondary">Değer</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatMoney(value, currency)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                    <Typography variant="caption" color="text.secondary">Ağırlık</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatPercent(pct)}</Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

type Props = {
    positions: ManualPositionResponse[];
    currency: string;
    onNewTrade: () => void;
};

export function PortfolioTypeChart({ positions, currency, onNewTrade }: Props) {
    const { t } = useTranslation();
    const groups = useMemo(() => buildTypeGroupData(positions), [positions]);
    const total = groups.reduce((sum, g) => sum + g.value, 0);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);

    if (groups.length === 0) {
        return (
            <Stack sx={{ alignItems: "center", py: 4, gap: 1 }}>
                <Typography variant="h3" aria-hidden="true">▦</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("portfolio.typeChart.noPositions")}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {t("portfolio.typeChart.noPositionsDesc")}
                </Typography>
                <Button variant="contained" color="secondary" size="small" onClick={onNewTrade} sx={{ mt: 1 }}>
                    {t("portfolio.typeChart.newTrade")}
                </Button>
            </Stack>
        );
    }

    return (
        // DİKKAT: justifyContent: "center" ile sağdaki uçurumu kapatıyoruz
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 4, alignItems: "center", justifyContent: "center" }}>

            {/* SOL TARAF: GRAFİK VE ÖZET BANDI */}
            <Stack sx={{ alignItems: "center", flexShrink: 0, width: { xs: "100%", md: 260 } }}>
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={groups}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={65} // İçi boşaltıldı
                            outerRadius={105}
                            paddingAngle={3}
                            animationBegin={0}
                            animationDuration={700}
                            onMouseEnter={(_, index) => setActiveSegment(index)}
                            onMouseLeave={() => setActiveSegment(null)}
                        >
                            {groups.map((g, index) => (
                                <Cell
                                    key={g.type}
                                    fill={g.fill}
                                    opacity={activeSegment === null || activeSegment === index ? 1 : 0.4}
                                    style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                                />
                            ))}
                        </Pie>
                        {/* Tooltip offset ile grafikten uzaklaştırıldı */}
                        <Tooltip content={<ChartTooltip total={total} currency={currency} />} offset={25} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Grafiğin ortasındaki yazı ezilmesin diye alta şık bir kutu olarak alındı */}
                <Box sx={{ textAlign: "center", mt: -2, bgcolor: "background.default", py: 1, px: 3, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                        {t("portfolio.typeChart.totalValue")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "text.primary" }}>
                        {formatMoney(total, currency)}
                    </Typography>
                </Box>
            </Stack>

            {/* SAĞ TARAF: DERLİ TOPLU LİSTE */}
            {/* DİKKAT: maxWidth: 500 eklenerek listenin sakız gibi sünmesi engellendi */}
            <Stack sx={{ gap: 1.5, flex: 1, maxWidth: 500, width: "100%" }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {t("portfolio.typeChart.typeDistribution")}
                </Typography>
                {groups.map((g) => {
                    const pct = total > 0 ? (g.value / total) * 100 : 0;
                    return (
                        <Stack key={g.type} direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: g.fill, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                                {g.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 42, textAlign: "right" }}>
                                {formatPercent(pct)}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: "0.78rem", fontWeight: 700, minWidth: 88, textAlign: "right" }}>
                                {formatMoney(g.value, currency)}
                            </Typography>
                            {g.totalPnl !== null && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        minWidth: 72,
                                        textAlign: "right",
                                        fontWeight: 600,
                                        color: g.totalPnl > 0 ? "success.main" : g.totalPnl < 0 ? "error.main" : "text.secondary",
                                    }}
                                >
                                    {formatSignedMoney(g.totalPnl, currency)}
                                </Typography>
                            )}
                        </Stack>
                    );
                })}
            </Stack>
        </Stack>
    );
}