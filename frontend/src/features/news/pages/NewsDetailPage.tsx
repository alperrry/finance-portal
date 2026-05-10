import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Alert, Box, Breadcrumbs, Button, Card, CardContent, Chip, Link, Skeleton, Stack, Typography } from "@mui/material";
import type { SyntheticEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { KapitalShell } from "../../../components/layout";
import { useNewsDetail } from "../hooks/useNewsDetail";
import { formatDate } from "../utils/newsFormatters";

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
                    <Stack direction={{ xs: "column", md: "row" }} gap={3} alignItems="flex-start">
                        <Card sx={{ flex: 1 }}>
                            <CardContent>
                                <Skeleton variant="text" width="35%" sx={{ mb: 1 }} />
                                <Skeleton variant="text" width="80%" />
                                <Skeleton variant="text" width="70%" sx={{ mb: 2 }} />
                                <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1, mb: 2 }} />
                                <Skeleton variant="text" />
                                <Skeleton variant="text" />
                                <Skeleton variant="text" width="65%" />
                            </CardContent>
                        </Card>
                        <Card sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
                            <CardContent>
                                <Skeleton variant="text" width="55%" sx={{ mb: 2 }} />
                                <Skeleton variant="text" width="70%" />
                                <Skeleton variant="text" width="45%" />
                                <Skeleton variant="text" width="60%" />
                            </CardContent>
                        </Card>
                    </Stack>
                )}

                {!loading && !invalidId && error && <Alert severity="error">{error}</Alert>}

                {!loading && !invalidId && !error && news && (
                    <Stack direction={{ xs: "column", md: "row" }} gap={3} alignItems="flex-start">
                        <Card sx={{ flex: 1 }}>
                            <CardContent>
                                <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: "wrap" }}>
                                    <Chip label={news.source?.name ?? "Bilinmeyen Kaynak"} size="small" color="secondary" />
                                    <Chip label={formatDate(news.publishedAt, "full")} size="small" variant="outlined" />
                                </Stack>

                                <Typography variant="h5" component="h1" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.35 }}>
                                    {news.title}
                                </Typography>

                                {news.imageUrl ? (
                                    <Box
                                        component="img"
                                        src={news.imageUrl}
                                        alt=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={(event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.hidden = true; }}
                                        sx={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 1, mb: 2, display: "block" }}
                                    />
                                ) : null}

                                <Box>
                                    {news.context ? (
                                        news.context.split("\n").map((paragraph, index) => (
                                            <Typography key={`${news.id}-p-${index}`} variant="body1" sx={{ mb: 1.5 }}>
                                                {paragraph}
                                            </Typography>
                                        ))
                                    ) : (
                                        <Typography variant="body1" color="text.secondary">
                                            Bu haber için içerik bilgisi bulunamadı.
                                        </Typography>
                                    )}
                                </Box>

                                <Stack direction="row" sx={{ gap: 1, mt: 3, flexWrap: "wrap" }}>
                                    <Button component={RouterLink} to="/news" variant="outlined" size="small" startIcon={<ArrowBackIcon />}>
                                        Listeye Dön
                                    </Button>
                                    {news.canonicalUrl ? (
                                        <Button
                                            href={news.canonicalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            variant="contained"
                                            color="secondary"
                                            size="small"
                                            endIcon={<OpenInNewIcon />}
                                        >
                                            Kaynağı Aç
                                        </Button>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                                    Haber Özeti
                                </Typography>
                                <Stack sx={{ gap: 2 }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>
                                            Kaynak
                                        </Typography>
                                        <Typography variant="body2">{news.source?.name ?? "Bilinmeyen"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>
                                            Durum
                                        </Typography>
                                        <Typography variant="body2">{news.status ?? "Yayınlandı"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                                            Etiketler
                                        </Typography>
                                        {detailTags.length > 0 ? (
                                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                                {detailTags.map((tag) => (
                                                    <Chip key={`${news.id}-${tag.key}`} label={tag.label} size="small" variant="outlined" />
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">Etiket bilgisi yok</Typography>
                                        )}
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                )}
            </Box>
        </KapitalShell>
    );
}
