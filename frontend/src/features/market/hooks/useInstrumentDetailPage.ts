import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { InstrumentType } from "../../analysis/api/historyApi";
import { useInstrumentDetail } from "./useInstrumentDetail";
import {
    formatCompactNumber,
    formatLocalDate,
    formatPercent,
    formatValueByType,
    toSafeNumber,
} from "../utils/marketFormatters";
import {
    calculatePeriodChange,
    getDisplayLatestNote,
    getDisplayLatestValue,
    getLastClose,
    getLastVolume,
    getSeriesHigh,
    getSeriesLow,
} from "../utils/instrumentSummary";
import { CHART_COLORS, DEFAULT_RANGE } from "../types";
import type { ChartSeries, InstrumentMetricCard, RangeKey } from "../types";

const parseType = (value: string | undefined): InstrumentType | null =>
    value === "stocks" || value === "fx" || value === "funds" || value === "bonds" ? value : null;

const parseRange = (value: string | null): RangeKey =>
    value === "1A" || value === "3A" || value === "6A" || value === "1Y" ? value : DEFAULT_RANGE;

export function useInstrumentDetailPage() {
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const instrumentType = parseType(params.type);
    const code = decodeURIComponent(params.code ?? "").trim();
    const range = parseRange(searchParams.get("range"));

    const {
        summary, summaryError, loadingSummary,
        history, historyError, loadingHistory,
        newsItems, newsError, loadingNews,
        rangeDates,
    } = useInstrumentDetail(instrumentType, code, range);

    const historyPoints = useMemo(() => history?.data ?? [], [history]);
    const periodChange = useMemo(() => calculatePeriodChange(historyPoints), [historyPoints]);
    const latestClose = useMemo(() => getLastClose(historyPoints), [historyPoints]);
    const highestValue = useMemo(() => getSeriesHigh(historyPoints), [historyPoints]);
    const lowestValue = useMemo(() => getSeriesLow(historyPoints), [historyPoints]);
    const lastVolume = useMemo(() => getLastVolume(historyPoints), [historyPoints]);

    const chartDates = useMemo(() => historyPoints.map((p) => p.date), [historyPoints]);
    const chartSeries = useMemo<ChartSeries[]>(
        () => summary
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

    return {
        instrumentType,
        code,
        range,
        summary, summaryError, loadingSummary,
        history, historyError, loadingHistory,
        newsItems, newsError, loadingNews,
        periodChange,
        chartDates,
        chartSeries,
        metricCards,
        updateRange,
    };
}