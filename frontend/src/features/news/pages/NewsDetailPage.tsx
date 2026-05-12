import { Alert, Box, Breadcrumbs, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { KapitalShell } from "../../../components/layout";
import { useNewsDetail } from "../hooks/useNewsDetail";
import { NewsDetailLayout } from "../components/NewsDetailLayout";
import { NewsDetailSkeleton } from "../components/NewsDetailSkeleton";

export default function NewsDetail() {
    const { loading, news, error, detailTags, invalidId } = useNewsDetail();

    return (
        <KapitalShell activePage="news">
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link component={RouterLink} to="/news" underline="hover" color="inherit">
                        Haberler
                    </Link>
                    <Typography color="text.primary">Detay</Typography>
                </Breadcrumbs>

                {invalidId && <Alert severity="error">Geçersiz haber kimliği.</Alert>}

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
