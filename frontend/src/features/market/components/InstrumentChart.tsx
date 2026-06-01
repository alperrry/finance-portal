import { Box, ButtonBase, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { InstrumentType } from "../../analysis/api/historyApi";
import type { ChartSeries, InstrumentSummary, RangeKey } from "../types";
import { RANGE_OPTIONS, CHART_COLORS, RANGE_I18N_KEY } from "../types";
import { formatValueByType } from "../utils/marketFormatters";
import { InstrumentLineChart } from "./InstrumentLineChart";

type Props = {
    dates: string[];
    series: ChartSeries[];
    range: RangeKey;
    instrumentType: InstrumentType;
    summary: InstrumentSummary | null;
    historyError: string | null;
    loadingHistory: boolean;
    onRangeChange: (range: RangeKey) => void;
};

const PANEL_SX = {
    border: "1px solid",
    borderColor: "divider",
    bgcolor: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.76)" : "rgba(255, 255, 255, 0.76)",
    boxShadow: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "0 16px 48px rgba(0, 0, 0, 0.32)" : "0 16px 48px rgba(17, 17, 17, 0.06)",
    backdropFilter: "blur(16px)",
    borderRadius: "28px",
    p: { xs: 2.5, md: 3 },
};

const STATUS_SX = {
    ...PANEL_SX,
    borderRadius: "22px",
    p: "18px 20px",
};

const KICKER_SX = {
    fontFamily: '"JetBrains Mono", monospace',
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    fontSize: 10,
    color: "text.secondary",
} as const;

export function InstrumentChart({
    dates,
    series,
    range,
    instrumentType,
    summary,
    historyError,
    loadingHistory,
    onRangeChange,
}: Props) {
    const { t } = useTranslation();

    return (
        <Box component="section" sx={PANEL_SX}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2.25, flexWrap: "wrap" }}>
                <Box>
                    <Typography sx={KICKER_SX}>{t("market.chart.closeSeries")}</Typography>
                    <Typography component="h2" sx={{ m: "10px 0 0", fontSize: 28, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}>
                        {t("market.chart.closeSeries")}
                    </Typography>
                    <Typography sx={{ m: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "text.secondary" }}>
                        {t("market.chart.help")}
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
                    {RANGE_OPTIONS.map((option) => {
                        const isActive = option.key === range;
                        const rangeLabel = t(`market.chart.range.${RANGE_I18N_KEY[option.key]}` as any) as string;
                        return (
                            <ButtonBase
                                key={option.key}
                                onClick={() => onRangeChange(option.key)}
                                sx={{
                                    border: "1px solid",
                                    borderRadius: "999px",
                                    px: 1.75,
                                    py: 1.375,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    transition: "transform 0.18s ease, background 0.18s ease, border-color 0.18s ease",
                                    borderColor: isActive ? "rgba(193, 98, 47, 0.34)" : "divider",
                                    bgcolor: isActive ? "rgba(193, 98, 47, 0.14)" : (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.84)",
                                    color: isActive ? "secondary.main" : "text.secondary",
                                    "&:hover": { transform: "translateY(-1px)" },
                                }}
                            >
                                {rangeLabel}
                            </ButtonBase>
                        );
                    })}
                </Box>
            </Box>

            {historyError ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25, borderColor: "rgba(224, 88, 88, 0.22)", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(80, 20, 20, 0.5)" : "rgba(253, 240, 240, 0.88)" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("market.chart.error")}</Typography>
                    <Typography variant="caption" color="text.secondary">{historyError}</Typography>
                </Box>
            ) : null}

            {loadingHistory ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("market.chart.loading.title")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t("market.chart.loading.subtitle", { range: t(`market.chart.range.${RANGE_I18N_KEY[range]}` as any) as string })}
                    </Typography>
                </Box>
            ) : null}

            <InstrumentLineChart
                dates={dates}
                series={series}
                emptyLabel={t("market.chart.noData")}
                yFormatter={(value) => formatValueByType(instrumentType, value, summary?.currency)}
            />

            {summary ? (
                <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1.75 }}>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: "text.secondary", fontSize: 12 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: CHART_COLORS.price, flexShrink: 0 }} />
                        {summary.title}
                    </Box>
                </Box>
            ) : null}
        </Box>
    );
}
