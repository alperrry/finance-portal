import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ManualPositionResponse } from "../api/portfolioApi";
import { buildTypeGroupData, formatMoney, formatPercent, formatSignedMoney } from "../utils/portfolioFormatters";

type ChartTooltipProps = {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number }>;
    total: number;
    currency: string;
};

function ChartTooltip({ active, payload, total, currency }: ChartTooltipProps) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const value = Number(item.value ?? 0);
    const pct = total > 0 ? (value / total) * 100 : 0;

    return (
        <Paper sx={{ p: 1.5, fontSize: "0.8rem", pointerEvents: "none" }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
            <Typography variant="caption" sx={{ display: "block" }}>{formatMoney(value, currency)}</Typography>
            <Typography variant="caption" color="text.secondary">{formatPercent(pct)}</Typography>
        </Paper>
    );
}

type Props = {
    positions: ManualPositionResponse[];
    currency: string;
    onNewTrade: () => void;
};

export function PortfolioTypeChart({ positions, currency, onNewTrade }: Props) {
    const groups = useMemo(() => buildTypeGroupData(positions), [positions]);
    const total = groups.reduce((sum, g) => sum + g.value, 0);

    if (groups.length === 0) {
        return (
            <Stack sx={{ alignItems: "center", py: 4, gap: 1 }}>
                <Typography variant="h3" aria-hidden="true">▦</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Henüz pozisyon yok</Typography>
                <Typography variant="body2" color="text.secondary">
                    İlk işlemini eklediğinde portföy dağılımı burada görünecek.
                </Typography>
                <Button variant="contained" color="secondary" size="small" onClick={onNewTrade} sx={{ mt: 1 }}>
                    + Yeni İşlem
                </Button>
            </Stack>
        );
    }

    return (
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 3, alignItems: "center" }}>
            <Box sx={{ position: "relative", flexShrink: 0, width: { xs: "100%", md: 260 } }}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 1,
                        textAlign: "center",
                        pointerEvents: "none",
                        width: 100,
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 900, fontSize: "0.75rem", lineHeight: 1.2, display: "block" }}>
                        {formatMoney(total, currency)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                        Toplam
                    </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                        <Pie
                            data={groups}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={62}
                            outerRadius={96}
                            paddingAngle={3}
                            animationBegin={0}
                            animationDuration={700}
                        >
                            {groups.map((g) => (
                                <Cell key={g.type} fill={g.fill} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip total={total} currency={currency} />} />
                    </PieChart>
                </ResponsiveContainer>
            </Box>

            <Stack sx={{ gap: 1.5, flex: 1, width: "100%" }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Tür Dağılımı
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
