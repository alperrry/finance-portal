import { Stack } from "@mui/material";
import type { NewsItem } from "../api/newsApi";
import type { NewsTag } from "../utils/newsFormatters";
import { NewsDetailContent } from "./NewsDetailContent";
import { NewsDetailSidebar } from "./NewsDetailSidebar";

interface NewsDetailLayoutProps {
    news: NewsItem;
    detailTags: NewsTag[];
}

export function NewsDetailLayout({ news, detailTags }: NewsDetailLayoutProps) {
    return (
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 3, alignItems: "flex-start" }}>
            <NewsDetailContent news={news} />
            <NewsDetailSidebar news={news} detailTags={detailTags} />
        </Stack>
    );
}
