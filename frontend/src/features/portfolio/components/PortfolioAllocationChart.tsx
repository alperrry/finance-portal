import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PortfolioResponse } from "../api/portfolioApi";
import { buildAllocationData, formatMoney, formatPercent, formatQuantity } from "../utils/portfolioFormatters";

type TooltipProps = {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number | string; payload?: { quantity?: number } }>;
    total: number;
    currency: string;
};

function AllocationTooltip({ active, payload, total, currency }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const value = Number(item.value ?? 0);
    const pct = total > 0 ? (value / total) * 100 : 0;

    return (
        <Paper sx={{ p: 1.5, fontSize: "0.8rem" }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
            <Typography variant="caption" sx={{ display: "block" }}>Miktar: {formatQuantity(item.payload?.quantity)}</Typography>
            <Typography variant="caption" sx={{ display: "block" }}>{formatMoney(value, currency)}</Typography>
            <Typography variant="caption" color="text.secondary">{formatPercent(pct)}</Typography>
        </Paper>
    );
}

type Props = {
    portfolio: PortfolioResponse;
    onNewTrade: () => void;
};

export function PortfolioAllocationChart({ portfolio, onNewTrade }: Props) {
    const data = useMemo(() => buildAllocationData(portfolio.items ?? []), [portfolio.items]);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);

    if (data.length === 0) {
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
        <Box sx={{ position: "relative" }}>
            <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1, textAlign: "center", pointerEvents: "none" }}>
                <Typography variant="body2" sx={{ fontWeight: 900 }}>{formatMoney(total, portfolio.displayCurrency)}</Typography>
                <Typography variant="caption" color="text.secondary">Toplam</Typography>
            </Box>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={72}
                        outerRadius={108}
                        paddingAngle={3}
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {data.map((item, index) => (
                            <Cell
                                key={item.id}
                                fill={item.fill}
                                opacity={activeSegment === null || activeSegment === index ? 1 : 0.3}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip total={total} currency={portfolio.displayCurrency} />} />
                    <Legend
                        formatter={(value, _entry, index) => (
                            <button
                                type="button"
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}
                                onClick={() => setActiveSegment(activeSegment === index ? null : index)}
                            >
                                {value}
                            </button>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );
}
