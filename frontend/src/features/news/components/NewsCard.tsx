import { Box, Button, Card, CardActions, CardContent, CardMedia, Chip, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import type { NewsItem } from "../api/newsApi";
import { buildDynamicTags, createExcerpt, formatDate } from "../utils/newsFormatters";

type Props = { news: NewsItem };

export function NewsCard({ news }: Props) {
    const { t } = useTranslation();
    const tags = buildDynamicTags(news);

    return (
        <Card sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {news.imageUrl ? (
                <CardMedia
                    component="img"
                    height={160}
                    image={news.imageUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(event) => { (event.currentTarget as HTMLImageElement).hidden = true; }}
                    sx={{ objectFit: "cover" }}
                />
            ) : null}
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {news.source?.name ?? t("news.card.unknownSource")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatDate(news.publishedAt)}
                    </Typography>
                </Stack>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 1, fontSize: "0.95rem", lineHeight: 1.4 }}>
                    {news.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {createExcerpt(news.context, 180)}
                </Typography>
                {tags.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {tags.map((tag) => (
                            <Chip key={`${news.id}-${tag.key}`} label={tag.label} size="small" variant="outlined" />
                        ))}
                    </Box>
                ) : null}
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                <Button component={RouterLink} to={`/news/${news.id}`} variant="contained" color="secondary" size="small">
                    {t("news.card.openDetail")}
                </Button>
                {news.canonicalUrl ? (
                    <Button href={news.canonicalUrl} target="_blank" rel="noopener noreferrer" variant="outlined" size="small">
                        {t("news.card.source")}
                    </Button>
                ) : null}
            </CardActions>
        </Card>
    );
}
