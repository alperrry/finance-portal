import { Box, Stack } from "@mui/material";
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
                        kicker="Canlı Haber Akışı"
                        title="Finans Haber Merkezi"
                        subtitle="Piyasalardaki son gelişmeleri tek panelde takip edin. Kaynağa bağlı detay, kategori bazlı filtreleme ve hızlı erişimle akışı yönetin."
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2, mt: 3 }}>
                        <MetricCard label="Toplam Haber" value={loading ? "—" : totalElements} />
                        <MetricCard label="Seçili Kategori" value={selectedCategoryName} />
                        <MetricCard label="Son Kontrol" value={navClock} />
                    </Stack>
                </SectionPanel>

                <Box sx={{ mb: 2 }}>
                    <NewsFilterBar
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onCategoryChange={(id) => { applyCategoryFilter(id); setPageIndex(1); }}
                        onRefresh={() => setReloadToken((t) => t + 1)}
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
                        Bu filtreye uygun haber bulunamadı.
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
