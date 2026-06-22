import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { SyntheticEvent } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import type { NewsItem } from "../api/newsApi";

import { formatDate } from "../utils/newsFormatters";
import { buildNewsPlaceholder } from "../utils/newsPlaceholder";

type Props = {
    news: NewsItem;
};

export function NewsDetailContent({ news }: Props) {
    const { t } = useTranslation();
    const placeholder = useMemo(() => buildNewsPlaceholder(news), [news]);
    return (
        <Card sx={{ flex: 1 }}>
            <CardContent>
                <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: "wrap" }}>
                    <Chip label={news.source?.name ?? t("news.detail.unknownSource")} size="small" color="secondary" />
                    <Chip label={formatDate(news.publishedAt, "full")} size="small" variant="outlined" />
                </Stack>

                <Typography variant="h5" component="h1" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.35 }}>
                    {news.title}
                </Typography>

                <Box
                    component="img"
                    src={news.imageUrl || placeholder}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                        if (!e.currentTarget.src.startsWith("data:")) e.currentTarget.src = placeholder;
                    }}
                    sx={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 1, mb: 2, display: "block" }}
                />

                <Box>
                    {news.context ? (
                        news.context.split("\n").map((paragraph: string, index: number) => (
                            <Typography key={`${news.id}-p-${index}`} variant="body1" sx={{ mb: 1.5 }}>
                                {paragraph}
                            </Typography>
                        ))
                    ) : (
                        <Typography variant="body1" color="text.secondary">
                            {t("news.detail.noContent")}
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" sx={{ gap: 1, mt: 3, flexWrap: "wrap" }}>
                    <Button component={RouterLink} to="/news" variant="outlined" size="small" startIcon={<ArrowBackIcon />}>
                        {t("news.detail.backToList")}
                    </Button>
                    {news.canonicalUrl && (
                        <Button
                            href={news.canonicalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="contained"
                            color="secondary"
                            size="small"
                            endIcon={<OpenInNewIcon />}
                        >
                            {t("news.detail.openSource")}
                        </Button>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
