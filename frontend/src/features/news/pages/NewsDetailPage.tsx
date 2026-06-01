import { Alert, Box, Breadcrumbs, Link, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { KapitalShell } from "../../../components/layout";
import { useNewsDetail } from "../hooks/useNewsDetail";
import { NewsDetailLayout } from "../components/NewsDetailLayout";
import { NewsDetailSkeleton } from "../components/NewsDetailSkeleton";

export default function NewsDetail() {
    const { t } = useTranslation();
    const { loading, news, error, detailTags, invalidId } = useNewsDetail();

    return (
        <KapitalShell activePage="news">
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link component={RouterLink} to="/news" underline="hover" color="inherit">
                        {t("nav.news")}
                    </Link>
                    <Typography color="text.primary">{t("news.detail.breadcrumb")}</Typography>
                </Breadcrumbs>

                {invalidId && <Alert severity="error">{t("news.detail.invalidId")}</Alert>}

                {loading && !invalidId && (
                    <NewsDetailSkeleton />
                )}

                {!loading && !invalidId && error && <Alert severity="error">{error}</Alert>}

                {!loading && !invalidId && !error && news && (
                    <NewsDetailLayout news={news} detailTags={detailTags} />
                )}
            </Box>
        </KapitalShell>
    );
}
