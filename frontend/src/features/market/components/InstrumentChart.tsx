import { Box, ButtonBase, Typography } from "@mui/material";
import type { InstrumentType } from "../../analysis/api/historyApi";
import type { ChartSeries, InstrumentSummary, RangeKey } from "../types";
import { RANGE_OPTIONS, CHART_COLORS } from "../types";
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
    bgcolor: "rgba(255, 255, 255, 0.76)",
    boxShadow: "0 16px 48px rgba(17, 17, 17, 0.06)",
    backdropFilter: "blur(16px)",
    borderRadius: "28px",
    p: { xs: 2.5, md: 3 },
} as const;

const STATUS_SX = {
    ...PANEL_SX,
    borderRadius: "22px",
    p: "18px 20px",
} as const;

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
    return (
        <Box component="section" sx={PANEL_SX}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2.25, flexWrap: "wrap" }}>
                <Box>
                    <Typography sx={KICKER_SX}>Tarihsel Grafik</Typography>
                    <Typography component="h2" sx={{ m: "10px 0 0", fontSize: 28, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}>
                        Kapanış Serisi
                    </Typography>
                    <Typography sx={{ m: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "text.secondary" }}>
                        Teknik indikatörler bu ekranda yok. Yalnızca seçili enstrümanın tarihsel fiyat eğrisi gösteriliyor.
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
                    {RANGE_OPTIONS.map((option) => {
                        const isActive = option.key === range;
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
                                    bgcolor: isActive ? "rgba(193, 98, 47, 0.14)" : "rgba(255, 255, 255, 0.84)",
                                    color: isActive ? "#7f3d1d" : "text.secondary",
                                    "&:hover": { transform: "translateY(-1px)" },
                                }}
                            >
                                {option.label}
                            </ButtonBase>
                        );
                    })}
                </Box>
            </Box>

            {historyError ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25, borderColor: "rgba(224, 88, 88, 0.22)", bgcolor: "rgba(253, 240, 240, 0.88)" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Tarihsel seri alınamadı</Typography>
                    <Typography variant="caption" color="text.secondary">{historyError}</Typography>
                </Box>
            ) : null}

            {loadingHistory ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Grafik hazırlanıyor</Typography>
                    <Typography variant="caption" color="text.secondary">{range} aralığındaki kapanış verileri yükleniyor.</Typography>
                </Box>
            ) : null}

            <InstrumentLineChart
                dates={dates}
                series={series}
                emptyLabel="Seçili aralık için çizilecek yeterli kapanış verisi yok."
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
