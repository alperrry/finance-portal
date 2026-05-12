import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { NewsItem } from "../api/newsApi";
import type { NewsTag } from "../utils/newsFormatters";

type Props = {
    news: NewsItem;
    detailTags: NewsTag[];
};

export function NewsDetailSidebar({ news, detailTags }: Props) {
    return (
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
    );
}
