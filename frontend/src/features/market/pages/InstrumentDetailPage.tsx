import { Box, Typography } from "@mui/material";
import { KapitalShell } from "../../../components/layout";
import { BondMetricsSection } from "../components/BondMetricsSection";
import { FundAllocationChart } from "../components/FundAllocationChart";
import { FxRatesSection } from "../components/FxRatesSection";
import { InstrumentChart } from "../components/InstrumentChart";
import { InstrumentHero } from "../components/InstrumentHero";
import { InstrumentMetrics } from "../components/InstrumentMetrics";
import { InstrumentNewsSection } from "../components/InstrumentNewsSection";
import { StockInfoSection } from "../components/StockInfoSection";
import { useInstrumentDetailPage } from "../hooks/useInstrumentDetailPage";

export default function InstrumentDetailPage() {
    const {
        instrumentType,
        code,
        range,
        summary, summaryError, loadingSummary,
        historyError, loadingHistory,
        newsItems, newsError, loadingNews,
        periodChange,
        chartDates,
        chartSeries,
        metricCards,
        updateRange,
        stockData,
        fxData,
        bondData,
    } = useInstrumentDetailPage();

    if (!instrumentType || !code) {
        return (
            <KapitalShell activePage="portfolio" showCategories={false}>
                <Box sx={{ minHeight: "100%" }}>
                    <Box sx={{ width: "min(1280px, calc(100% - 40px))", mx: "auto", display: "flex", flexDirection: "column", gap: 2.25 }}>
                        <Box
                            sx={{
                                border: "1px solid",
                                borderColor: "rgba(224, 88, 88, 0.22)",
                                bgcolor: "rgba(253, 240, 240, 0.88)",
                                borderRadius: "22px",
                                p: "18px 20px",
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>Geçersiz enstrüman bağlantısı</Typography>
                            <Typography variant="caption" color="text.secondary">Liste sayfasından tekrar seçim yap.</Typography>
                        </Box>
                    </Box>
                </Box>
            </KapitalShell>
        );
    }

    return (
        <KapitalShell activePage="portfolio" showCategories={false}>
            <Box sx={{ minHeight: "100%" }}>
                <Box sx={{ width: "min(1280px, calc(100% - 40px))", mx: "auto", display: "flex", flexDirection: "column", gap: 2.25 }}>
                    <InstrumentHero
                        code={code}
                        summary={summary}
                        periodChange={periodChange}
                        range={range}
                        instrumentType={instrumentType}
                        loadingSummary={loadingSummary}
                        summaryError={summaryError}
                    />
                    <InstrumentMetrics metricCards={metricCards} />
                    {instrumentType === "funds" && <FundAllocationChart code={code} />}
                    {(instrumentType === "stocks" || instrumentType === "indexes") && (
                        <StockInfoSection summary={summary} stockData={stockData} />
                    )}
                    {instrumentType === "fx" && <FxRatesSection fxData={fxData} />}
                    {instrumentType === "bonds" && <BondMetricsSection bondData={bondData} />}
                    <InstrumentChart
                        dates={chartDates}
                        series={chartSeries}
                        range={range}
                        instrumentType={instrumentType}
                        summary={summary}
                        historyError={historyError}
                        loadingHistory={loadingHistory}
                        onRangeChange={updateRange}
                    />
                    <InstrumentNewsSection
                        summary={summary}
                        newsItems={newsItems}
                        newsError={newsError}
                        loadingNews={loadingNews}
                    />
                </Box>
            </Box>
        </KapitalShell>
    );
}