import { Box, Card, CardContent, Container, Grid, Typography } from "@mui/material";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export default function FeaturesSection() {
    const { t } = useTranslation();

    const FEATURES: { icon: SvgIconComponent; title: string; description: string }[] = [
        {
            icon: AccountBalanceWalletOutlinedIcon,
            title: t("home.features.portfolio.title"),
            description: t("home.features.portfolio.desc"),
        },
        {
            icon: ShowChartOutlinedIcon,
            title: t("home.features.liveMarket.title"),
            description: t("home.features.liveMarket.desc"),
        },
        {
            icon: ArticleOutlinedIcon,
            title: t("home.features.newsSection.title"),
            description: t("home.features.newsSection.desc"),
        },
        {
            icon: QueryStatsOutlinedIcon,
            title: t("home.features.analysisSection.title"),
            description: t("home.features.analysisSection.desc"),
        },
    ];

    return (
        <Box sx={{ bgcolor: "background.paper", py: { xs: 6, md: 10 }, borderTop: "1px solid", borderColor: "divider" }}>
            <Container maxWidth="lg">
                <Box sx={{ mb: 6, textAlign: "center" }}>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 700, letterSpacing: 2 }}>
                        {t("home.features.overline")}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                        {t("home.features.title")}
                    </Typography>
                </Box>
                <Grid container spacing={3}>
                    {FEATURES.map(({ icon: Icon, title, description }) => (
                        <Grid key={title} size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card
                                sx={{
                                    height: "100%",
                                    boxShadow: "none",
                                    borderRadius: 2,
                                    transition: "box-shadow 0.2s, border-color 0.2s",
                                    "&:hover": { boxShadow: "0 4px 24px rgba(0,0,0,0.07)", borderColor: "secondary.main" },
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
                                        <Icon sx={{ color: "secondary.main", fontSize: 24 }} />
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                                        {title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
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
