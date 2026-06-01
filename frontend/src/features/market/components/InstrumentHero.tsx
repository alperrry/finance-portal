import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import type { InstrumentType } from "../../analysis/api/historyApi";
import type { InstrumentSummary, RangeKey } from "../types";
import { RANGE_I18N_KEY } from "../types";
import { toSafeNumber, formatPercent } from "../utils/marketFormatters";

type Props = {
    code: string;
    summary: InstrumentSummary | null;
    periodChange: number | null;
    range: RangeKey;
    instrumentType: InstrumentType;
    loadingSummary: boolean;
    summaryError: string | null;
};

const CARD_SX = {
    border: "1px solid",
    borderColor: "divider",
    bgcolor: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.76)" : "rgba(255, 255, 255, 0.76)",
    boxShadow: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "0 16px 48px rgba(0, 0, 0, 0.32)" : "0 16px 48px rgba(17, 17, 17, 0.06)",
    backdropFilter: "blur(16px)",
};

const STATUS_SX = {
    ...CARD_SX,
    borderRadius: "22px",
    p: "18px 20px",
    "& strong": { display: "block", mb: 0.5, fontSize: 14, fontWeight: 700 },
    "& span": { fontSize: 12, lineHeight: 1.6, color: "text.secondary" },
} as const;

export function InstrumentHero({ code, summary, periodChange, range, instrumentType, loadingSummary, summaryError }: Props) {
    const { t } = useTranslation();
    const changeTone =
        toSafeNumber(periodChange ?? summary?.snapshotChange) === null
            ? null
            : (periodChange ?? summary?.snapshotChange ?? 0) < 0
              ? "down"
              : "up";

    const rangeLabel = t(`market.chart.range.${RANGE_I18N_KEY[range]}` as any) as string;

    return (
        <>
            <Box
                component="section"
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "1.35fr 0.75fr" },
                    gap: 2.25,
                    alignItems: "stretch",
                }}
            >
                <Box
                    sx={{
                        ...CARD_SX,
                        borderRadius: "30px",
                        p: { xs: 2.5, md: 4 },
                        background: (theme) => theme.palette.mode === "dark"
                            ? "radial-gradient(circle at top left, rgba(193, 98, 47, 0.14), transparent 34%), linear-gradient(145deg, rgba(33, 28, 24, 0.92), rgba(24, 21, 18, 0.9))"
                            : "radial-gradient(circle at top left, rgba(193, 98, 47, 0.14), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(247, 245, 241, 0.9))",
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontSize: 10,
                            color: "text.secondary",
                        }}
                    >
                        {t("market.instrument.detail")}
                    </Typography>

                    <Box sx={{ mt: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2.25 }}>
                        <Box>
                            <Typography
                                component="h1"
                                sx={{
                                    m: 0,
                                    fontFamily: '"Playfair Display", serif',
                                    fontSize: { xs: "38px", lg: "clamp(38px, 6vw, 54px)" },
                                    lineHeight: 0.96,
                                    letterSpacing: "-0.05em",
                                    fontWeight: 700,
                                }}
                            >
                                {summary?.title ?? code}
                            </Typography>
                            <Box component="p" sx={{ m: "12px 0 0", display: "flex", flexWrap: "wrap", gap: 1.5, fontSize: 15, lineHeight: 1.6, color: "text.secondary" }}>
                                <Box component="strong" sx={{ color: "text.primary" }}>{code}</Box>
                                <span>{summary?.subtitle ?? t("market.instrument.defaultName")}</span>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                minWidth: 180,
                                borderRadius: "24px",
                                p: "18px 20px",
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(240, 237, 230, 0.94)" : "rgba(17, 17, 17, 0.94)",
                                color: (theme) => theme.palette.mode === "dark" ? "rgba(17, 17, 17, 0.88)" : "rgba(255, 255, 255, 0.82)",
                                flexShrink: 0,
                            }}
                        >
                            <Typography
                                component="strong"
                                sx={{
                                    display: "block",
                                    fontSize: 28,
                                    lineHeight: 1,
                                    letterSpacing: "-0.04em",
                                    fontWeight: 700,
                                    color: changeTone === "up" ? "#5bb870" : changeTone === "down" ? "#e05858" : "inherit",
                                }}
                            >
                                {formatPercent(periodChange ?? summary?.snapshotChange)}
                            </Typography>
                            <Typography component="span" sx={{ display: "block", mt: 1.25, fontSize: 12, lineHeight: 1.5 }}>
                                {rangeLabel} {t("market.instrument.rangeChange")}
                            </Typography>
                        </Box>
                    </Box>

                    <Typography component="p" sx={{ m: "18px 0 0", maxWidth: 680, fontSize: 14, lineHeight: 1.75, color: "text.secondary" }}>
                        {summary?.helper ?? t("market.instrument.chartHelp")}
                    </Typography>

                    <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                        <Button
                            component={RouterLink}
                            to="/portfolio"
                            variant="outlined"
                            color="inherit"
                            size="small"
                        >
                            {t("market.instrument.backToList")}
                        </Button>
                        <Button
                            component={RouterLink}
                            to={`/analysis?type=${instrumentType}&code=${encodeURIComponent(code)}&range=${range}`}
                            variant="contained"
                            color="primary"
                            size="small"
                        >
                            {t("market.instrument.analyzeButton")}
                        </Button>
                    </Box>
                </Box>

                <Box
                    sx={{
                        ...CARD_SX,
                        borderRadius: "28px",
                        p: { xs: 2.5, md: 3.5 },
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontSize: 10,
                            color: "text.secondary",
                        }}
                    >
                        {t("market.instrument.livePriceTab")}
                    </Typography>
                    <Typography
                        component="h2"
                        sx={{ m: "10px 0 0", fontSize: 28, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}
                    >
                        {t("market.instrument.summaryTab")}
                    </Typography>
                    <Box sx={{ mt: 2.75, display: "grid", gap: 1.5 }}>
                        {(summary?.stats ?? []).map((item) => (
                            <Box
                                key={item.label}
                                sx={{
                                    borderRadius: "18px",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "rgba(17, 17, 17, 0.04)",
                                    p: "14px 16px",
                                }}
                            >
                                <Typography component="span" sx={{ display: "block", fontSize: 11, color: "text.secondary" }}>{item.label}</Typography>
                                <Typography component="strong" sx={{ display: "block", mt: 1, fontSize: 14, fontWeight: 700 }}>{item.value}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {summaryError ? (
                <Box sx={{ ...STATUS_SX, borderColor: "rgba(224, 88, 88, 0.22)", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(80, 20, 20, 0.5)" : "rgba(253, 240, 240, 0.88)" }}>
                    <strong>{t("market.instrument.loadError")}</strong>
                    <span>{summaryError}</span>
                </Box>
            ) : null}

            {loadingSummary ? (
                <Box sx={STATUS_SX}>
                    <strong>{t("market.instrument.loading.title")}</strong>
                    <span>{t("market.instrument.loading.subtitle")}</span>
                </Box>
            ) : null}
        </>
    );
}
