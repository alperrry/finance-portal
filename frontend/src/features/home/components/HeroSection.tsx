import { Box, Button, Card, CardContent, Chip, Container, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { MarketItem, MarketSnapshot } from "../types";
import { useAuth } from "../../../app/auth/AuthContext";

type Props = {
    snapshot: MarketSnapshot | null;
    loading: boolean;
};

function HeroCard({ item }: { item: MarketItem }) {
    const isUp = item.direction === "up";
    const isDown = item.direction === "down";
    const changeColor = isUp ? "#2f8f58" : isDown ? "#c84b4b" : "#999";
    const changeBg = isUp ? "rgba(47,143,88,0.1)" : isDown ? "rgba(200,75,75,0.1)" : "rgba(150,150,150,0.1)";

    return (
        <Card
            sx={{
                bgcolor: "#1c1c1c",
                border: "1px solid #2a2a2a",
                borderRadius: 2,
                transition: "border-color 0.2s",
                "&:hover": { borderColor: "#c1622f" },
            }}
        >
            <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="caption" sx={{ color: "#888", fontWeight: 500 }}>
                        {item.marketLabel}
                    </Typography>
                    {item.changePercent !== null && (
                        <Chip
                            label={`${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`}
                            size="small"
                            sx={{ bgcolor: changeBg, color: changeColor, fontWeight: 700, fontSize: "0.7rem", height: 20 }}
                        />
                    )}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#fff", mb: 0.5 }}>
                    {item.symbol}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff" }}>
                    {item.price !== null
                        ? item.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : "—"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#666" }}>
                    {item.currency ?? ""}
                </Typography>
            </CardContent>
        </Card>
    );
}

export default function HeroSection({ snapshot, loading }: Props) {
    const navigate = useNavigate();
    const { authenticated, login } = useAuth();
    const heroItems = snapshot?.heroItems ?? [];

    return (
        <Box
            sx={{
                background: "linear-gradient(160deg, #111111 0%, #1a1a1a 100%)",
                py: { xs: 8, md: 12 },
                position: "relative",
                overflow: "hidden",
                "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "1px",
                    background: "linear-gradient(90deg, transparent, #c1622f44, transparent)",
                },
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={6} sx={{ alignItems: "center" }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box>
                            <Chip
                                label="Finansal Analiz Platformu"
                                size="small"
                                sx={{ bgcolor: "rgba(193,98,47,0.15)", color: "#c1622f", mb: 3, fontWeight: 600 }}
                            />
                            <Typography
                                variant="h2"
                                sx={{
                                    fontWeight: 800,
                                    color: "#fff",
                                    lineHeight: 1.1,
                                    mb: 2,
                                    fontSize: { xs: "2.2rem", md: "3rem" },
                                }}
                            >
                                Piyasayı Anlık
                                <Box component="span" sx={{ color: "#c1622f" }}> Takip Et.</Box>
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{ color: "#999", mb: 4, maxWidth: 420, lineHeight: 1.8 }}
                            >
                                Hisse senetleri, döviz, fon ve tahvilleri tek ekranda izleyin.
                                Gelişmiş analiz araçlarıyla portföyünüzü yönetin.
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                {authenticated ? (
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={() => navigate("/portfolio")}
                                        sx={{ bgcolor: "#c1622f", "&:hover": { bgcolor: "#a8512a" }, px: 4, fontWeight: 700 }}
                                    >
                                        Portföyüme Git
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={login}
                                        sx={{ bgcolor: "#c1622f", "&:hover": { bgcolor: "#a8512a" }, px: 4, fontWeight: 700 }}
                                    >
                                        Hemen Başla
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => (authenticated ? navigate("/analysis") : login())}
                                    sx={{ color: "#fff", borderColor: "#444", "&:hover": { borderColor: "#c1622f" }, px: 3 }}
                                >
                                    Analiz Yap
                                </Button>
                            </Stack>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Grid container spacing={2}>
                            {loading
                                ? Array.from({ length: 4 }).map((_, i) => (
                                    <Grid key={i} size={{ xs: 6 }}>
                                        <Skeleton variant="rounded" height={120} sx={{ bgcolor: "#1c1c1c" }} />
                                    </Grid>
                                ))
                                : heroItems.slice(0, 4).map((item) => (
                                    <Grid key={item.key} size={{ xs: 6 }}>
                                        <HeroCard item={item} />
                                    </Grid>
                                ))}
                        </Grid>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
