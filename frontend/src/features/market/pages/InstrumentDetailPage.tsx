import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { KapitalShell } from "../../../components/layout";
import type { InstrumentType } from "../../analysis/api/historyApi";
import { useInstrumentDetail } from "../hooks/useInstrumentDetail";
import {
    toSafeNumber,
    formatPercent,
    formatCompactNumber,
    formatLocalDate,
    formatValueByType,
} from "../utils/marketFormatters";
import {
    calculatePeriodChange,
    getLastClose,
    getSeriesHigh,
    getSeriesLow,
    getLastVolume,
    getDisplayLatestValue,
    getDisplayLatestNote,
} from "../utils/instrumentSummary";
import type { RangeKey, ChartSeries, InstrumentMetricCard } from "../types";
import { DEFAULT_RANGE, CHART_COLORS } from "../types";
import { InstrumentHero } from "../components/InstrumentHero";
import { InstrumentMetrics } from "../components/InstrumentMetrics";
import { InstrumentChart } from "../components/InstrumentChart";
import { InstrumentNewsSection } from "../components/InstrumentNewsSection";
const parseType = (value: string | undefined): InstrumentType | null =>
    value === "stocks" || value === "fx" || value === "funds" || value === "bonds" ? value : null;

const parseRange = (value: string | null): RangeKey =>
    value === "1A" || value === "3A" || value === "6A" || value === "1Y" ? value : DEFAULT_RANGE;

export default function InstrumentDetailPage() {
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const instrumentType = parseType(params.type);
    const code = decodeURIComponent(params.code ?? "").trim();
    const range = parseRange(searchParams.get("range"));

    const { summary, summaryError, loadingSummary, history, historyError, loadingHistory, newsItems, newsError, loadingNews, rangeDates } =
        useInstrumentDetail(instrumentType, code, range);

    const historyPoints = useMemo(() => history?.data ?? [], [history]);
    const periodChange = useMemo(() => calculatePeriodChange(historyPoints), [historyPoints]);
    const latestClose = useMemo(() => getLastClose(historyPoints), [historyPoints]);
    const highestValue = useMemo(() => getSeriesHigh(historyPoints), [historyPoints]);
    const lowestValue = useMemo(() => getSeriesLow(historyPoints), [historyPoints]);
    const lastVolume = useMemo(() => getLastVolume(historyPoints), [historyPoints]);

    const chartDates = useMemo(() => historyPoints.map((p) => p.date), [historyPoints]);
    const chartSeries = useMemo<ChartSeries[]>(
        () =>
            summary
                ? [{ key: "close", label: "Kapanış", color: CHART_COLORS.price, values: historyPoints.map((p) => toSafeNumber(p.close)) }]
                : [],
        [historyPoints, summary],
    );

    const metricCards = useMemo<InstrumentMetricCard[]>(() => {
        if (!summary) return [];

        return [
            {
                label: "Son Değer",
                value: formatValueByType(summary.type, getDisplayLatestValue(summary, latestClose), summary.currency),
                note: getDisplayLatestNote(summary, latestClose, history?.to),
            },
            {
                label: `${range} Değişim`,
                value: formatPercent(periodChange ?? summary.snapshotChange),
                note: `${formatLocalDate(rangeDates.from)} → ${formatLocalDate(rangeDates.to)}`,
            },
            {
                label: "Aralık Yüksek",
                value: formatValueByType(summary.type, highestValue, summary.currency),
                note: "Seçili periyodun tepe noktası",
            },
            {
                label: "Aralık Düşük",
                value: formatValueByType(summary.type, lowestValue, summary.currency),
                note: "Seçili periyodun dip noktası",
            },
            {
                label: summary.type === "stocks" ? "Hacim" : "Son Kayıt",
                value: summary.type === "stocks" ? formatCompactNumber(lastVolume) : formatLocalDate(summary.latestDate),
                note: summary.type === "stocks" ? "Son işlem günündeki hacim" : "Son güncel veri tarihi",
            },
        ];
    }, [history?.to, highestValue, lastVolume, latestClose, lowestValue, periodChange, range, rangeDates, summary]);

    const updateRange = (nextRange: RangeKey) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("range", nextRange);
        setSearchParams(nextParams, { replace: true });
    };

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
