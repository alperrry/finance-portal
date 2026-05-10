import { Box, Card, CardContent, Container, Grid, Typography } from "@mui/material";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

const FEATURES: { icon: SvgIconComponent; title: string; description: string }[] = [
    {
        icon: AccountBalanceWalletOutlinedIcon,
        title: "Portföy Takibi",
        description: "Hisse, döviz, fon ve tahvillerinizi tek ekranda izleyin. Gerçek zamanlı kar/zarar hesaplaması.",
    },
    {
        icon: ShowChartOutlinedIcon,
        title: "Canlı Piyasa",
        description: "WebSocket bağlantısıyla anlık fiyat güncellemeleri. Dört piyasayı eş zamanlı takip edin.",
    },
    {
        icon: ArticleOutlinedIcon,
        title: "Haber Akışı",
        description: "Finansal haberler, kategori filtreleme ve enstrümana özel haber takibi.",
    },
    {
        icon: QueryStatsOutlinedIcon,
        title: "Gelişmiş Analiz",
        description: "Mum grafikler, teknik indikatörler, çizim araçları ve enstrüman karşılaştırma.",
    },
];

export default function FeaturesSection() {
    return (
        <Box sx={{ bgcolor: "#fff", py: { xs: 6, md: 10 }, borderTop: "1px solid #eeebe4" }}>
            <Container maxWidth="lg">
                <Box sx={{ mb: 6, textAlign: "center" }}>
                    <Typography variant="overline" sx={{ color: "#c1622f", fontWeight: 700, letterSpacing: 2 }}>
                        Özellikler
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "#111", mt: 0.5 }}>
                        Neler Sunuyoruz?
                    </Typography>
                </Box>
                <Grid container spacing={3}>
                    {FEATURES.map(({ icon: Icon, title, description }) => (
                        <Grid key={title} size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card
                                sx={{
                                    height: "100%",
                                    border: "1px solid #eeebe4",
                                    boxShadow: "none",
                                    borderRadius: 2,
                                    transition: "box-shadow 0.2s, border-color 0.2s",
                                    "&:hover": { boxShadow: "0 4px 24px rgba(0,0,0,0.07)", borderColor: "#c1622f" },
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            bgcolor: "rgba(193,98,47,0.1)",
                                            borderRadius: 2,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            mb: 2,
                                        }}
                                    >
                                        <Icon sx={{ color: "#c1622f", fontSize: 24 }} />
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#111", mb: 1 }}>
                                        {title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.7 }}>
                                        {description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
