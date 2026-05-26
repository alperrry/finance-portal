import { Box, Paper, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PortfolioItemResponse } from "../api/portfolioApi";
import { buildAllocationData, formatMoney, formatPercent, formatQuantity } from "../utils/portfolioFormatters";

type TooltipProps = {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number | string; payload?: { quantity?: number; fill?: string } }>;
    total: number;
    currency: string;
};

// 1. PROFESYONEL TOOLTIP BİLEŞENİ
function AllocationTooltip({ active, payload, total, currency }: TooltipProps) {
    if (!active || !payload?.length) return null;

    const item = payload[0];
    const value = Number(item.value ?? 0);
    const pct = total > 0 ? (value / total) * 100 : 0;
    const color = item.payload?.fill || "primary.main"; // Grafikteki rengi alıyoruz

    return (
        <Paper elevation={4} sx={{ p: 2, minWidth: 180, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            {/* Başlık ve Renk Noktası */}
            <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
            </Stack>

            {/* Hizalanmış Veri Satırları */}
            <Stack sx={{ gap: 0.75 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                    <Typography variant="caption" color="text.secondary">Değer</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatMoney(value, currency)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                    <Typography variant="caption" color="text.secondary">Ağırlık</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatPercent(pct)}</Typography>
                </Box>
                {item.payload?.quantity ? (
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                        <Typography variant="caption" color="text.secondary">Miktar</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatQuantity(item.payload.quantity)}</Typography>
                    </Box>
                ) : null}
            </Stack>
        </Paper>
    );
}

type Props = {
    items: PortfolioItemResponse[];
    displayCurrency: string;
};

// 2. PASTA GRAFİK BİLEŞENİ
export function PortfolioAllocationChart({ items, displayCurrency }: Props) {
    const data = useMemo(() => buildAllocationData(items ?? []), [items]);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);

    if (data.length === 0) {
        return (
            <Stack sx={{ alignItems: "center", py: 2, gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Değer bilgisi olan pozisyon bulunamadı.</Typography>
            </Stack>
        );
    }

    return (
        <Stack sx={{ alignItems: "center" }}>
            {/* Recharts Grafiği */}
            <Box sx={{ width: "100%", position: "relative" }}>
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={65} // Ortası boşaldığı için biraz daha etli yaptık
                            outerRadius={105}
                            paddingAngle={3}
                            animationBegin={0}
                            animationDuration={800}
                            onMouseEnter={(_, index) => setActiveSegment(index)}
                            onMouseLeave={() => setActiveSegment(null)}
                        >
                            {data.map((item, index) => (
                                <Cell
                                    key={item.id}
                                    fill={item.fill}
                                    opacity={activeSegment === null || activeSegment === index ? 1 : 0.4}
                                    style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                                />
                            ))}
                        </Pie>
                        {/* offset={25} ile Tooltip'i fareden biraz daha uzaklaştırdık */}
                        <Tooltip content={<AllocationTooltip total={total} currency={displayCurrency} />} offset={25} />
                    </PieChart>
                </ResponsiveContainer>
            </Box>

            {/* DEĞERLEME ALT TARAFA TAŞINDI (Jilet gibi bir özet alanı) */}
            <Box sx={{ textAlign: "center", mt: -2, bgcolor: "background.default", py: 1, px: 3, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                    TOPLAM PORTFÖY DEĞERİ
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: "text.primary" }}>
                    {formatMoney(total, displayCurrency)}
                </Typography>
            </Box>
        </Stack>
    );
}