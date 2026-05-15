import { Box, Chip, Dialog, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { PortfolioItemResponse } from "../api/portfolioApi";
import { INSTRUMENT_LABELS } from "../types";
import { formatMoney, formatPercent, formatQuantity, formatSignedMoney, getProfitTone, toNumber } from "../utils/portfolioFormatters";

const toneColor = (tone: string) => tone === "up" ? "success.main" : tone === "down" ? "error.main" : "text.secondary";

function PositionSparkline({ item }: { item: PortfolioItemResponse }) {
    const data = (item.priceTrend?.length ? item.priceTrend : [item.avgCost, item.currentPrice ?? item.avgCost]).map((value, index) => ({ index, value }));
    const stroke = getProfitTone(item.profitLoss) === "down" ? "#dc2626" : "#059669";
    return (
        <ResponsiveContainer width={110} height={38}>
            <LineChart data={data}>
                <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

function PositionDetailModal({ item, displayCurrency, onClose }: { item: PortfolioItemResponse; displayCurrency: string; onClose: () => void }) {
    const profitTone = getProfitTone(item.profitLoss);
    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Pozisyon Detayı</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{item.instrumentSymbol ?? "Enstrüman"}</Typography>
            </DialogTitle>
            <DialogContent>
                <Stack sx={{ gap: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        {item.instrumentName ?? INSTRUMENT_LABELS[item.instrumentType]}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        {formatMoney(item.currentValue, displayCurrency)}
                    </Typography>
                    <Divider />
                    {[
                        { label: "Miktar", value: formatQuantity(item.quantity) },
                        { label: "Güncel", value: formatMoney(item.currentPrice, item.nativeCurrency ?? "TRY", 4) },
                        { label: "K/Z", value: `${formatSignedMoney(item.profitLoss, displayCurrency)} (${formatPercent(item.profitLossPct)})`, color: toneColor(profitTone) },
                        { label: "Bugün", value: formatSignedMoney(item.dailyChange, item.nativeCurrency ?? "TRY"), color: toneColor(getProfitTone(item.dailyChange)) },
                    ].map(({ label, value, color }) => (
                        <Box key={label} sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="body2" color={color ?? "text.primary"} sx={{ fontWeight: 700 }}>{value}</Typography>
                        </Box>
                    ))}
                    <Box sx={{ mt: 1 }}>
                        <PositionSparkline item={item} />
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}

type Props = {
    items: PortfolioItemResponse[];
    displayCurrency: string;
};

export function PositionsTable({ items, displayCurrency }: Props) {
    const [selectedPosition, setSelectedPosition] = useState<PortfolioItemResponse | null>(null);

    const sortedItems = useMemo(
        () => [...items].sort((left, right) => (toNumber(right.currentValue) ?? 0) - (toNumber(left.currentValue) ?? 0)),
        [items],
    );

    const columns: GridColDef<PortfolioItemResponse>[] = useMemo(() => [
        {
            field: "instrument",
            headerName: "Enstrüman",
            flex: 1.2,
            minWidth: 130,
            renderCell: ({ row }) => (
                <Box sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.instrumentSymbol ?? "-"}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {row.instrumentName ?? "Enstrüman"}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "type",
            headerName: "Tip",
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => (
                <Chip label={INSTRUMENT_LABELS[row.instrumentType]} size="small" variant="outlined" />
            ),
        },
        {
            field: "trend",
            headerName: "Trend",
            flex: 1,
            minWidth: 120,
            sortable: false,
            renderCell: ({ row }) => <PositionSparkline item={row} />,
        },
        {
            field: "quantity",
            headerName: "Miktar",
            flex: 0.7,
            minWidth: 80,
            align: "right",
            headerAlign: "right",
            renderCell: ({ row }) => formatQuantity(row.quantity),
        },
        {
            field: "avgCost",
            headerName: "Ort. Maliyet",
            flex: 0.9,
            minWidth: 100,
            align: "right",
            headerAlign: "right",
            renderCell: ({ row }) => formatMoney(row.avgCost, row.nativeCurrency ?? "TRY", 4),
        },
        {
            field: "currentPrice",
            headerName: "Güncel Fiyat",
            flex: 0.9,
            minWidth: 100,
            align: "right",
            headerAlign: "right",
            renderCell: ({ row }) => (
                <Typography
                    variant="body2"
                    sx={{ color: toneColor(getProfitTone(row.dailyChange)) }}
                >
                    {formatMoney(row.currentPrice, row.nativeCurrency ?? "TRY", 4)}
                </Typography>
            ),
        },
        {
            field: "currentValue",
            headerName: "Güncel Değer",
            flex: 0.9,
            minWidth: 100,
            align: "right",
            headerAlign: "right",
            renderCell: ({ row }) => formatMoney(row.currentValue, displayCurrency),
        },
        {
            field: "profitLoss",
            headerName: "K/Z",
            flex: 1,
            minWidth: 110,
            align: "right",
            headerAlign: "right",
            renderCell: ({ row }) => {
                const tone = getProfitTone(row.profitLoss);
                const icon = tone === "up" ? "▲" : tone === "down" ? "▼" : "•";
                return (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: toneColor(tone) }}>
                        {icon} {formatSignedMoney(row.profitLoss, displayCurrency)}
                    </Typography>
                );
            },
        },
        {
            field: "profitLossPct",
            headerName: "K/Z %",
            flex: 0.8,
            minWidth: 90,
            align: "right",
            headerAlign: "right",
            renderCell: ({ row }) => (
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: toneColor(getProfitTone(row.profitLossPct)) }}
                >
                    {formatPercent(row.profitLossPct)}
                </Typography>
            ),
        },
    ], [displayCurrency]);

    if (sortedItems.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Henüz pozisyon yok, ilk işlemini ekle.
            </Typography>
        );
    }

    return (
        <>
            <AppDataGrid<PortfolioItemResponse>
                rows={sortedItems}
                columns={columns}
                getRowId={(row) => row.id}
                onRowClick={(row) => setSelectedPosition(row)}
                autoHeight
                rowHeight={56}
                sx={{ mt: 0 }}
            />
            {selectedPosition ? (
                <PositionDetailModal
                    item={selectedPosition}
                    displayCurrency={displayCurrency}
                    onClose={() => setSelectedPosition(null)}
                />
            ) : null}
        </>
    );
}
