import { Box, Card, CardContent, Chip, Container, Grid, Skeleton, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { MarketItem, MarketSnapshot } from "../types";

type Props = {
    snapshot: MarketSnapshot | null;
    loading: boolean;
};

function MarketCard({ item }: { item: MarketItem }) {
    const isUp = item.direction === "up";
    const isDown = item.direction === "down";
    const changeColor = isUp ? "#2f8f58" : isDown ? "#c84b4b" : "text.secondary";

    return (
        <Card
            sx={{
                borderRadius: 2,
                boxShadow: "none",
                transition: "box-shadow 0.2s, border-color 0.2s",
                "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderColor: "secondary.main" },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 500, textTransform: "uppercase" }}
                    >
                        {item.marketLabel}
                    </Typography>
                    {item.changePercent !== null && (
                        <Chip
                            label={`${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`}
                            size="small"
                            sx={{
                                bgcolor: isUp
                                    ? "rgba(47,143,88,0.1)"
                                    : isDown
                                    ? "rgba(200,75,75,0.1)"
                                    : "rgba(128,128,128,0.1)",
                                color: changeColor,
                                fontWeight: 700,
                                fontSize: "0.7rem",
                            }}
                        />
                    )}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {item.symbol}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {item.price !== null
                        ? item.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {item.name}
                </Typography>
            </CardContent>
        </Card>
    );
}

export default function MarketOverview({ snapshot, loading }: Props) {
    const { t } = useTranslation();
    const items = snapshot?.marketItems ?? [];

    return (
        <Box sx={{ bgcolor: "background.default", py: { xs: 6, md: 10 } }}>
            <Container maxWidth="lg">
                <Box sx={{ mb: 5 }}>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 700, letterSpacing: 2 }}>
                        {t("nav.markets")}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                        {t("home.marketOverview.title")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t("home.marketOverview.description")}
                    </Typography>
                </Box>
                <Grid container spacing={3}>
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Skeleton variant="rounded" height={130} sx={{ borderRadius: 2 }} />
                            </Grid>
                        ))
                        : items.slice(0, 6).map((item) => (
                            <Grid key={item.key} size={{ xs: 12, sm: 6, md: 4 }}>
                                <MarketCard item={item} />
                            </Grid>
                        ))}
                </Grid>
            </Container>
        </Box>
    );
}
