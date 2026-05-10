import { Box, Chip, Typography } from "@mui/material";
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

export function InstrumentNewsSection({ summary, newsItems, newsError, loadingNews }: Props) {
    return (
        <Box component="section" sx={PANEL_SX}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2.25 }}>
                <Box>
                    <Typography sx={KICKER_SX}>Haber Akışı</Typography>
                    <Typography component="h2" sx={{ m: "10px 0 0", fontSize: 28, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}>
                        Enstrümana Özel Haberler
                    </Typography>
                    <Typography sx={{ m: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "text.secondary" }}>
                        Google News RSS araması üzerinden listelenir. Başlıklar yeni sekmede açılır.
                    </Typography>
                </Box>

                {summary ? (
                    <Chip
                        label={buildNewsQuery(summary)}
                        sx={{
                            borderRadius: "999px",
                            bgcolor: "rgba(17, 17, 17, 0.92)",
                            color: "#fff",
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    />
                ) : null}
            </Box>

            {newsError ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25, borderColor: "rgba(224, 88, 88, 0.22)", bgcolor: "rgba(253, 240, 240, 0.88)" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Haber akışı alınamadı</Typography>
                    <Typography variant="caption" color="text.secondary">{newsError}</Typography>
                </Box>
            ) : null}

            {loadingNews ? (
                <Box sx={{ ...STATUS_SX, mt: 2.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Haberler yükleniyor</Typography>
                    <Typography variant="caption" color="text.secondary">Seçili enstrümana göre ilgili başlıklar aranıyor.</Typography>
                </Box>
            ) : null}

            {!loadingNews && !newsError && (newsItems?.length ?? 0) === 0 ? (
                <Box sx={{ mt: 2.25, borderRadius: "24px", border: "1px dashed", borderColor: "divider", bgcolor: "rgba(255, 255, 255, 0.5)", p: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>İlgili haber bulunamadı</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>Arama terimi için Google RSS sonuç dönmedi.</Typography>
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
                                bgcolor: "rgba(255, 255, 255, 0.84)",
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
                                {item.description || "Başlık, Google News RSS arama sonucundan getirildi."}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            ) : null}
        </Box>
    );
}
