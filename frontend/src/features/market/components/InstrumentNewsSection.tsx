import { Box, Chip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { GoogleNewsItem } from "../../news/api/newsApi";
import type { InstrumentSummary } from "../types";
import { formatLocalDate } from "../utils/marketFormatters";
import { buildNewsQuery } from "../utils/instrumentSummary";

type Props = {
    summary: InstrumentSummary | null;
    newsItems: GoogleNewsItem[] | null;
    newsError: string | null;
    loadingNews: boolean;
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

export function InstrumentNewsSection({ summary, newsItems, newsError, loadingNews }: Props) {
    const { t } = useTranslation();

    return (
        <Box component="section" sx={PANEL_SX}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2.25 }}>
                <Box>
                    <Typography sx={KICKER_SX}>{t("market.news.kicker")}</Typography>
                    <Typography component="h2" sx={{ m: "10px 0 0", fontSize: 28, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}>
                        {t("market.news.title")}
                    </Typography>
                    <Typography sx={{ m: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "text.secondary" }}>
                        {t("market.news.help")}
                    </Typography>
                </Box>

                {summary ? (
                    <Chip
                        label={buildNewsQuery(summary)}
                        sx={{
                            borderRadius: "999px",
                            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(240, 237, 230, 0.92)" : "rgba(17, 17, 17, 0.92)",
                            color: (theme) => theme.palette.mode === "dark" ? "#111" : "#fff",
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    />
                ) : null}
            </Box>

            {newsError ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25, borderColor: "rgba(224, 88, 88, 0.22)", bgcolor: "rgba(253, 240, 240, 0.88)" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("market.news.error")}</Typography>
                    <Typography variant="caption" color="text.secondary">{newsError}</Typography>
                </Box>
            ) : null}

            {loadingNews ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("market.news.loading.title")}</Typography>
                    <Typography variant="caption" color="text.secondary">{t("market.news.loading.subtitle")}</Typography>
                </Box>
            ) : null}

            {!loadingNews && !newsError && (newsItems?.length ?? 0) === 0 ? (
                <Box sx={{ mt: 2.25, borderRadius: "24px", border: "1px dashed", borderColor: "divider", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.5)" : "rgba(255, 255, 255, 0.5)", p: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("market.news.empty.title")}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>{t("market.news.empty.subtitle")}</Typography>
                </Box>
            ) : null}

            {newsItems && newsItems.length > 0 ? (
                <Box
                    sx={{
                        mt: 2.25,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                        gap: 1.75,
                    }}
                >
                    {newsItems.map((item) => (
                        <Box
                            key={`${item.link}-${item.publishedAt ?? "na"}`}
                            component="a"
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            sx={{
                                borderRadius: "22px",
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.84)" : "rgba(255, 255, 255, 0.84)",
                                p: 2.25,
                                textDecoration: "none",
                                color: "inherit",
                                display: "block",
                                transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                                "&:hover": {
                                    transform: "translateY(-2px)",
                                    borderColor: "rgba(193, 98, 47, 0.28)",
                                    boxShadow: "0 18px 36px rgba(17, 17, 17, 0.08)",
                                },
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, fontSize: 11, color: "text.secondary" }}>
                                <span>{item.sourceName ?? "Google News"}</span>
                                <strong>{formatLocalDate(item.publishedAt)}</strong>
                            </Box>
                            <Typography variant="h6" component="h3" sx={{ mt: 1.5, fontSize: 16, lineHeight: 1.4, fontWeight: 700 }}>
                                {item.title}
                            </Typography>
                            <Typography sx={{ mt: 1.5, fontSize: 13, lineHeight: 1.65, color: "text.secondary" }}>
                                {item.description || t("market.news.fallbackDesc")}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            ) : null}
        </Box>
    );
}
