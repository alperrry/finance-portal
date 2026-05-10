import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
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

    if (sortedItems.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Henüz pozisyon yok, ilk işlemini ekle.
            </Typography>
        );
    }

    return (
        <>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Enstrüman</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Tip</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trend</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Miktar</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Ort. Maliyet</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Güncel Fiyat</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Güncel Değer</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>K/Z</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>K/Z %</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedItems.map((item) => {
                            const profitTone = getProfitTone(item.profitLoss);
                            const trendIcon = profitTone === "up" ? "▲" : profitTone === "down" ? "▼" : "•";
                            return (
                                <TableRow
                                    key={item.id}
                                    onClick={() => setSelectedPosition(item)}
                                    sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                                >
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.instrumentSymbol ?? "-"}</Typography>
                                            <Typography variant="caption" color="text.secondary">{item.instrumentName ?? "Enstrüman"}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={INSTRUMENT_LABELS[item.instrumentType]} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell><PositionSparkline item={item} /></TableCell>
                                    <TableCell align="right">{formatQuantity(item.quantity)}</TableCell>
                                    <TableCell align="right">{formatMoney(item.avgCost, item.nativeCurrency ?? "TRY", 4)}</TableCell>
                                    <TableCell align="right" sx={{ color: toneColor(getProfitTone(item.dailyChange)) }}>
                                        {formatMoney(item.currentPrice, item.nativeCurrency ?? "TRY", 4)}
                                    </TableCell>
                                    <TableCell align="right">{formatMoney(item.currentValue, displayCurrency)}</TableCell>
                                    <TableCell align="right" sx={{ color: toneColor(profitTone), fontWeight: 700 }}>
                                        {trendIcon} {formatSignedMoney(item.profitLoss, displayCurrency)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: toneColor(getProfitTone(item.profitLossPct)), fontWeight: 700 }}>
                                        {formatPercent(item.profitLossPct)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
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
