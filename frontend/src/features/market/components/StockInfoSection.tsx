import { Box, Chip, LinearProgress, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { InstrumentSummary } from "../types";
import type { StockResponse } from "../api/marketApi";
import { formatCompactNumber, formatNumber, toSafeNumber } from "../utils/marketFormatters";

type Props = {
    summary: InstrumentSummary | null;
    stockData: StockResponse | null;
};

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
    const pct = high > low ? Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100)) : 50;
    return (
        <Box>
            <Box sx={{ position: "relative", mb: 0.5 }}>
                <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "action.hover",
                        "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: "primary.main" },
                    }}
                />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">{formatNumber(low, 2)}</Typography>
                <Typography variant="caption" color="text.secondary">{formatNumber(high, 2)}</Typography>
            </Box>
        </Box>
    );
}

export function StockInfoSection({ summary, stockData }: Props) {
    const { t } = useTranslation();
    if (!stockData) return null;

    const current = toSafeNumber(stockData.price);
    const low52 = toSafeNumber(stockData.fiftyTwoWeekLow);
    const high52 = toSafeNumber(stockData.fiftyTwoWeekHigh);

    return (
        <Box
            sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "16px",
                p: "20px 24px",
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
            }}
        >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
                {t("market.stock.companyInfo")}
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {stockData.sector && (
                    <Chip label={stockData.sector} size="small" variant="outlined" />
                )}
                {stockData.indexName && (
                    <Chip label={stockData.indexName} size="small" variant="outlined" />
                )}
                {stockData.currency && (
                    <Chip label={stockData.currency} size="small" variant="outlined" />
                )}
            </Box>

            {stockData.longName && summary?.title !== stockData.longName && (
                <Box>
                    <Typography variant="caption" color="text.secondary">{t("market.stock.fullName")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{stockData.longName}</Typography>
                </Box>
            )}

            {stockData.marketCap && (
                <Box>
                    <Typography variant="caption" color="text.secondary">{t("market.stock.marketCap")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCompactNumber(stockData.marketCap)} {stockData.currency ?? "TRY"}
                    </Typography>
                </Box>
            )}

            {current !== null && low52 !== null && high52 !== null && (
                <Box>
                    <Typography variant="caption" color="text.secondary">{t("market.stock.range52w")}</Typography>
                    <Box sx={{ mt: 0.75 }}>
                        <RangeBar low={low52} high={high52} current={current} />
                    </Box>
                </Box>
            )}
        </Box>
    );
}
