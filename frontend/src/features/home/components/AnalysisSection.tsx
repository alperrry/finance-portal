import { Box, Button, Container, Grid, List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/auth/AuthContext";

const CAPABILITIES = [
    "Mum ve çizgi grafik görünümü",
    "SMA, EMA, Bollinger Bantları, Ichimoku",
    "RSI, MACD, Stokastik indikatörler",
    "Trend çizgisi ve dikdörtgen çizim araçları",
    "Enstrüman karşılaştırma modu",
    "Tam ekran analiz paneli",
];

const INDICATOR_PREVIEW = [
    { label: "RSI", val: "58.4", color: "#2f8f58" },
    { label: "MACD", val: "+2.1", color: "#2f8f58" },
    { label: "ATR", val: "4.2", color: "#999" },
];

export default function AnalysisSection() {
    const navigate = useNavigate();
    const { authenticated, login } = useAuth();

    return (
        <Box sx={{ bgcolor: "#111111", py: { xs: 6, md: 10 } }}>
            <Container maxWidth="lg">
                <Grid container spacing={6} sx={{ alignItems: "center" }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="overline" sx={{ color: "#c1622f", fontWeight: 700, letterSpacing: 2 }}>
                            Analiz Araçları
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#fff", mt: 0.5, mb: 2 }}>
                            Profesyonel Teknik Analiz
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#999", mb: 4, lineHeight: 1.8 }}>
                            Gelişmiş grafik araçları ve teknik indikatörlerle piyasaları derinlemesine analiz edin.
                        </Typography>
                        <List dense disablePadding sx={{ mb: 4 }}>
                            {CAPABILITIES.map((cap) => (
                                <ListItem key={cap} disableGutters sx={{ py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <TaskAltOutlinedIcon sx={{ color: "#c1622f", fontSize: 18 }} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={cap}
                                        slotProps={{ primary: { variant: "body2", style: { color: "#ccc" } } }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => (authenticated ? navigate("/analysis") : login())}
                            sx={{ bgcolor: "#c1622f", "&:hover": { bgcolor: "#a8512a" }, px: 4, fontWeight: 700 }}
                        >
                            Analiz Sayfasına Git
                        </Button>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                bgcolor: "#1a1a1a",
                                border: "1px solid #2a2a2a",
                                borderRadius: 3,
                                p: 3,
                                minHeight: 280,
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                                {["SMA 20", "EMA 50", "BB", "MACD"].map((ind) => (
                                    <Box
                                        key={ind}
                                        sx={{
                                            px: 1.5,
                                            py: 0.5,
                                            bgcolor: "rgba(193,98,47,0.15)",
                                            borderRadius: 1,
                                            border: "1px solid rgba(193,98,47,0.3)",
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: "#c1622f", fontWeight: 600 }}>
                                            {ind}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                            {[70, 50, 65, 45, 80, 55, 90].map((w, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        height: 2,
                                        bgcolor: i % 2 === 0 ? "#c1622f" : "#2f8f58",
                                        opacity: 0.3 + i * 0.08,
                                        borderRadius: 1,
                                        width: `${w}%`,
                                    }}
                                />
                            ))}
                            <Box
                                sx={{
                                    mt: "auto",
                                    display: "flex",
                                    gap: 2,
                                    pt: 2,
                                    borderTop: "1px solid #222",
                                }}
                            >
                                {INDICATOR_PREVIEW.map(({ label, val, color }) => (
                                    <Box key={label}>
                                        <Typography variant="caption" sx={{ color: "#666", display: "block" }}>
                                            {label}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color }}>
                                            {val}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
