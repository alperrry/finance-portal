import { Box, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { KapitalShell } from "../../../components/layout";
import { MetricCard } from "../../../components/ui/MetricCard";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { NewsCard } from "../components/NewsCard";
import { NewsCardSkeleton } from "../components/NewsCardSkeleton";
import { NewsFilterBar } from "../components/NewsFilterBar";
import { NewsPagination } from "../components/NewsPagination";
import { useNewsList } from "../hooks/useNewsList";

export default function NewsList() {
    const { t } = useTranslation();
    const {
        loading,
        cards,
        totalPages,
        totalElements,
        categories,
        selectedCategoryId,
        selectedCategoryName,
        navClock,
        pageIndex,
        setPageIndex,
        setReloadToken,
        applyCategoryFilter,
    } = useNewsList();

    return (
        <KapitalShell activePage="news" selectedCategoryId={selectedCategoryId}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <SectionPanel sx={{ mb: 3 }}>
                    <PageHeader
                        kicker={t("news.list.title")}
                        title={t("news.list.pageTitle")}
                        subtitle={t("news.list.subtitle")}
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2, mt: 3 }}>
                        <MetricCard label={t("news.list.totalLabel")} value={loading ? "—" : totalElements} />
                        <MetricCard label={t("news.list.selectedCategory")} value={selectedCategoryName} />
                        <MetricCard label={t("news.list.lastCheck")} value={navClock} />
                    </Stack>
                </SectionPanel>

                <Box sx={{ mb: 2 }}>
                    <NewsFilterBar
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onCategoryChange={(id) => { applyCategoryFilter(id); setPageIndex(1); }}
                        onRefresh={() => setReloadToken()}
                    />
                </Box>

                {loading && (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <NewsCardSkeleton key={`skeleton-${index}`} />
                        ))}
                    </Box>
                )}

                {!loading && cards.length === 0 && (
                    <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                        {t("news.list.noResults")}
                    </Box>
                )}

                {!loading && cards.length > 0 && (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
                        {cards.map((news) => <NewsCard key={news.id} news={news} />)}
                    </Box>
                )}

                <NewsPagination
                    pageIndex={pageIndex}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    onPageChange={setPageIndex}
                />
            </Box>
        </KapitalShell>
    );
}
