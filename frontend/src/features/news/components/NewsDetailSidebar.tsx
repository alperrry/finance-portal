import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { NewsItem } from "../api/newsApi";
import type { NewsTag } from "../utils/newsFormatters";

type Props = {
    news: NewsItem;
    detailTags: NewsTag[];
};

export function NewsDetailSidebar({ news, detailTags }: Props) {
    const { t } = useTranslation();
    return (
        <Card sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
            <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                    {t("news.sidebar.summary")}
                </Typography>
                <Stack sx={{ gap: 2 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>
                            {t("news.sidebar.source")}
                        </Typography>
                        <Typography variant="body2">{news.source?.name ?? t("news.sidebar.unknownSource")}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>
                            {t("news.sidebar.status")}
                        </Typography>
                        <Typography variant="body2">{news.status ?? t("news.sidebar.published")}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                            {t("news.sidebar.tags")}
                        </Typography>
                        {detailTags.length > 0 ? (
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                {detailTags.map((tag) => (
                                    <Chip key={`${news.id}-${tag.key}`} label={tag.label} size="small" variant="outlined" />
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">{t("news.sidebar.noTags")}</Typography>
                        )}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}
