import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { InstrumentType } from "../../analysis/api/historyApi";
import type { InstrumentSummary, RangeKey } from "../types";
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
    bgcolor: "rgba(255, 255, 255, 0.76)",
    boxShadow: "0 16px 48px rgba(17, 17, 17, 0.06)",
    backdropFilter: "blur(16px)",
} as const;

const STATUS_SX = {
    ...CARD_SX,
    borderRadius: "22px",
    p: "18px 20px",
    "& strong": { display: "block", mb: 0.5, fontSize: 14, fontWeight: 700 },
    "& span": { fontSize: 12, lineHeight: 1.6, color: "text.secondary" },
} as const;

export function InstrumentHero({ code, summary, periodChange, range, instrumentType, loadingSummary, summaryError }: Props) {
    const changeTone =
        toSafeNumber(periodChange ?? summary?.snapshotChange) === null
            ? null
            : (periodChange ?? summary?.snapshotChange ?? 0) < 0
              ? "down"
              : "up";

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
                        background:
                            "radial-gradient(circle at top left, rgba(193, 98, 47, 0.14), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(247, 245, 241, 0.9))",
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
                        Enstrüman Detayı
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
                                <span>{summary?.subtitle ?? "Enstrüman"}</span>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                minWidth: 180,
                                borderRadius: "24px",
                                p: "18px 20px",
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "rgba(17, 17, 17, 0.94)",
                                color: "rgba(255, 255, 255, 0.82)",
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
                                {range} görünümündeki toplam değişim
                            </Typography>
                        </Box>
                    </Box>

                    <Typography component="p" sx={{ m: "18px 0 0", maxWidth: 680, fontSize: 14, lineHeight: 1.75, color: "text.secondary" }}>
                        {summary?.helper ?? "Grafik seçili aralıktaki tarihsel seriyi gösterir. Daha ileri teknik indikatörler için analiz ekranına geçebilirsin."}
                    </Typography>

                    <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                        <Button
                            component={RouterLink}
                            to="/portfolio"
                            variant="outlined"
                            color="inherit"
                            size="small"
                        >
                            Enstrümanlara Dön
                        </Button>
                        <Button
                            component={RouterLink}
                            to={`/analysis?type=${instrumentType}&code=${encodeURIComponent(code)}&range=${range}`}
                            variant="contained"
                            color="primary"
                            size="small"
                        >
                            Analize Git
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
                        Canlı Referans
                    </Typography>
                    <Typography
                        component="h2"
                        sx={{ m: "10px 0 0", fontSize: 28, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}
                    >
                        Özet Kartlar
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
                <Box sx={{ ...STATUS_SX, borderColor: "rgba(224, 88, 88, 0.22)", bgcolor: "rgba(253, 240, 240, 0.88)" }}>
                    <strong>Enstrüman detayı alınamadı</strong>
                    <span>{summaryError}</span>
                </Box>
            ) : null}

            {loadingSummary ? (
                <Box sx={STATUS_SX}>
                    <strong>Detay kartı hazırlanıyor</strong>
                    <span>Seçili enstrümanın özet alanları yükleniyor.</span>
                </Box>
            ) : null}
        </>
    );
}
