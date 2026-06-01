import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { InstrumentType } from "../../analysis/api/historyApi";
import { useInstrumentDetail } from "./useInstrumentDetail";
import {
    fetchBonds,
    fetchFunds,
    fetchFx,
    fetchStocks,
    type BondResponse,
    type FundResponse,
    type FxResponse,
    type StockResponse,
} from "../api/marketApi";
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
import { CHART_COLORS, DEFAULT_RANGE, RANGE_I18N_KEY } from "../types";
import type { ChartSeries, InstrumentMetricCard, RangeKey } from "../types";

const parseType = (value: string | undefined): InstrumentType | null =>
    value === "stocks" || value === "indexes" || value === "commodities" || value === "crypto" ||
    value === "fx" || value === "funds" || value === "bonds" ? value : null;

const parseRange = (value: string | null): RangeKey =>
    value === "1A" || value === "3A" || value === "6A" || value === "1Y" ? value : DEFAULT_RANGE;

export function useInstrumentDetailPage() {
    const { t } = useTranslation();
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
            ? [{ key: "close", label: t("market.metrics.close"), color: CHART_COLORS.price, values: historyPoints.map((p) => toSafeNumber(p.close)) }]
            : [],
        [historyPoints, summary, t],
    );

    const stocksQuery = useQuery({
        queryKey: ["market", "stocks", "STOCK"],
        queryFn: () => fetchStocks(undefined, "STOCK"),
        enabled: instrumentType === "stocks",
        staleTime: 5 * 60 * 1000,
    });
    const indexesQuery = useQuery({
        queryKey: ["market", "stocks", "INDEX"],
        queryFn: () => fetchStocks(undefined, "INDEX"),
        enabled: instrumentType === "indexes",
        staleTime: 5 * 60 * 1000,
    });
    const fxQuery = useQuery({
        queryKey: ["market", "fx"],
        queryFn: () => fetchFx(),
        enabled: instrumentType === "fx",
        staleTime: 5 * 60 * 1000,
    });
    const bondsQuery = useQuery({
        queryKey: ["market", "bonds"],
        queryFn: () => fetchBonds(),
        enabled: instrumentType === "bonds",
        staleTime: 5 * 60 * 1000,
    });
    const fundsQuery = useQuery({
        queryKey: ["market", "funds"],
        queryFn: () => fetchFunds(),
        enabled: instrumentType === "funds",
        staleTime: 5 * 60 * 1000,
    });

    const stockData = useMemo<StockResponse | null>(() => {
        if (instrumentType === "stocks") return stocksQuery.data?.find((s) => s.symbol === code) ?? null;
        if (instrumentType === "indexes") return indexesQuery.data?.find((s) => s.symbol === code) ?? null;
        return null;
    }, [code, indexesQuery.data, instrumentType, stocksQuery.data]);

    const fxData = useMemo<FxResponse | null>(
        () => instrumentType === "fx" ? (fxQuery.data?.find((f) => f.currencyCode === code) ?? null) : null,
        [code, fxQuery.data, instrumentType],
    );

    const bondData = useMemo<BondResponse | null>(
        () => instrumentType === "bonds" ? (bondsQuery.data?.find((b) => b.evdsSeriesCode === code) ?? null) : null,
        [code, bondsQuery.data, instrumentType],
    );

    const fundData = useMemo<FundResponse | null>(
        () => instrumentType === "funds" ? (fundsQuery.data?.find((f) => f.code === code) ?? null) : null,
        [code, fundsQuery.data, instrumentType],
    );

    const metricCards = useMemo<InstrumentMetricCard[]>(() => {
        if (!summary) return [];
        const rangeLabel = t(`market.chart.range.${RANGE_I18N_KEY[range]}` as any) as string;
        return [
            {
                label: t("market.metrics.lastValue"),
                value: formatValueByType(summary.type, getDisplayLatestValue(summary, latestClose), summary.currency),
                note: getDisplayLatestNote(summary, latestClose, history?.to),
            },
            {
                label: `${rangeLabel} ${t("market.metrics.change")}`,
                value: formatPercent(periodChange ?? summary.snapshotChange),
                note: `${formatLocalDate(rangeDates.from)} → ${formatLocalDate(rangeDates.to)}`,
            },
            {
                label: t("market.metrics.rangeHigh"),
                value: formatValueByType(summary.type, highestValue, summary.currency),
                note: t("market.metrics.rangeHighNote"),
            },
            {
                label: t("market.metrics.rangeLow"),
                value: formatValueByType(summary.type, lowestValue, summary.currency),
                note: t("market.metrics.rangeLowNote"),
            },
            {
                label: summary.type === "stocks" ? t("market.metrics.volume") : t("market.metrics.lastRecord"),
                value: summary.type === "stocks" ? formatCompactNumber(lastVolume) : formatLocalDate(summary.latestDate),
                note: summary.type === "stocks" ? t("market.metrics.volumeNote") : t("market.metrics.lastRecordNote"),
            },
        ];
    }, [history?.to, highestValue, lastVolume, latestClose, lowestValue, periodChange, range, rangeDates, summary, t]);

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
        stockData,
        fxData,
        bondData,
        fundData,
    };
}
