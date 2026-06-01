import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LineStyle } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import i18n from "../../../i18n";
import {
    fetchInstrumentHistory,
    type HistoryResponse,
} from "../api/historyApi";
import { getIndicatorHistory, getLatestIndicator } from "../api/indicatorsApi";
import type { StockIndicator } from "../../../types/indicator";
import {
    type CandlestickCloud,
    type CandlestickOverlay,
    type CandlestickPoint,
} from "../../../components/charts/CandlestickChart";
import {
    INDICATOR_COLORS,
    CHART_COLORS,
    type OverlayIndicatorKey,
} from "../types";
import type { InstrumentType } from "../api/historyApi";
import type { ChartSeries } from "../components/LightweightLineChart";
import {
    addBusinessDays,
    buildEnrichedHistory,
    calculatePeriodChange,
    emitIndicatorError,
    formatCompactNumber,
    formatIndicatorSnapshotValue,
    formatValueByType,
    getMacdContext,
    getMomentumComment,
    getRsiComment,
    getRsiContext,
    getStochasticComment,
    getStochasticContext,
} from "../utils/analysisFormatters";

type HistoryHookInput = {
    resolvedType: InstrumentType;
    resolvedCode: string;
    rangeDates: { from: string; to: string };
    activeOverlayIndicators: OverlayIndicatorKey[];
};

const EMPTY_INDICATOR_HISTORY: StockIndicator[] = [];

export function useAnalysisHistory({ resolvedType, resolvedCode, rangeDates, activeOverlayIndicators }: HistoryHookInput) {
    const { t } = useTranslation();
    const enabled = Boolean(resolvedCode);
    const stocksEnabled = enabled && resolvedType === "stocks";

    const historyQuery = useQuery({
        queryKey: ["analysis", "history", resolvedType, resolvedCode, rangeDates.from, rangeDates.to],
        queryFn: () => fetchInstrumentHistory(resolvedType, resolvedCode, rangeDates.from, rangeDates.to),
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    const indicatorHistoryQuery = useQuery({
        queryKey: ["analysis", "indicator-history", resolvedCode, rangeDates.from, rangeDates.to],
        queryFn: async () => {
            try {
                return await getIndicatorHistory(resolvedCode, rangeDates.from, rangeDates.to);
            } catch (error) {
                emitIndicatorError(i18n.t("analysis.errors.indicatorData"), error);
                throw error;
            }
        },
        enabled: stocksEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const latestIndicatorQuery = useQuery({
        queryKey: ["analysis", "latest-indicator", resolvedCode],
        queryFn: () => getLatestIndicator(resolvedCode),
        enabled: stocksEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const historyData: HistoryResponse | null = historyQuery.data ?? null;
    const indicatorHistoryData: StockIndicator[] = indicatorHistoryQuery.data ?? EMPTY_INDICATOR_HISTORY;
    const latestIndicator: StockIndicator | null = latestIndicatorQuery.data ?? null;

    const isHistoryLoading = historyQuery.isLoading;
    const historyError = historyQuery.error ? (historyQuery.error instanceof Error ? historyQuery.error.message : i18n.t("analysis.errors.historicalData")) : null;
    const isIndicatorHistoryLoading = indicatorHistoryQuery.isLoading;
    const indicatorHistoryError = indicatorHistoryQuery.error ? (indicatorHistoryQuery.error instanceof Error ? indicatorHistoryQuery.error.message : i18n.t("analysis.errors.indicatorHistory")) : null;

    const enrichedHistory = useMemo(() => buildEnrichedHistory(historyData?.data ?? [], indicatorHistoryData), [historyData, indicatorHistoryData]);
    const latestPoint = enrichedHistory.at(-1) ?? null;
    const periodChange = useMemo(() => calculatePeriodChange(enrichedHistory), [enrichedHistory]);
    const dates = useMemo(() => enrichedHistory.map((point) => point.date), [enrichedHistory]);
    const candlestickData = useMemo<CandlestickPoint[]>(
        () => enrichedHistory.map((point) => ({ date: point.date, open: point.open, high: point.high, low: point.low, close: point.close, volume: point.volume })),
        [enrichedHistory],
    );

    const priceSeries = useMemo<ChartSeries[]>(() => {
        const series: ChartSeries[] = [{ key: "close", label: t("analysis.chart.price"), color: CHART_COLORS.price, values: enrichedHistory.map((p) => p.close), strokeWidth: 2.8 }];
        const addOverlay = (key: OverlayIndicatorKey, label: string, color: string, values: Array<number | null>, strokeWidth = 2.2, dashArray?: string) => {
            if (activeOverlayIndicators.includes(key)) series.push({ key, label, color, values, strokeWidth, dashArray });
        };
        addOverlay("sma20", "SMA 20", INDICATOR_COLORS.sma20, enrichedHistory.map((p) => p.sma20));
        addOverlay("sma50", "SMA 50", INDICATOR_COLORS.sma50, enrichedHistory.map((p) => p.sma50));
        addOverlay("sma200", "SMA 200", INDICATOR_COLORS.sma200, enrichedHistory.map((p) => p.sma200), 2);
        addOverlay("ema12", "EMA 12", INDICATOR_COLORS.ema12, enrichedHistory.map((p) => p.ema12), 2);
        addOverlay("ema26", "EMA 26", INDICATOR_COLORS.ema26, enrichedHistory.map((p) => p.ema26), 2);
        if (activeOverlayIndicators.includes("bollinger")) {
            series.push(
                { key: "bollingerUpper", label: t("analysis.chart.bollingerUpper"), color: INDICATOR_COLORS.bollingerUpper, values: enrichedHistory.map((p) => p.bollingerUpper), strokeWidth: 1.8, dashArray: "6 4" },
                { key: "bollingerMiddle", label: t("analysis.chart.bollingerMiddle"), color: INDICATOR_COLORS.bollingerMiddle, values: enrichedHistory.map((p) => p.bollingerMiddle), strokeWidth: 2 },
                { key: "bollingerLower", label: t("analysis.chart.bollingerLower"), color: INDICATOR_COLORS.bollingerLower, values: enrichedHistory.map((p) => p.bollingerLower), strokeWidth: 1.8, dashArray: "6 4" },
            );
        }
        if (activeOverlayIndicators.includes("ichimoku")) {
            series.push(
                { key: "ichimokuTenkan", label: "Tenkan", color: INDICATOR_COLORS.ichimokuTenkan, values: enrichedHistory.map((p) => p.ichimokuTenkan), strokeWidth: 1.9 },
                { key: "ichimokuKijun", label: "Kijun", color: INDICATOR_COLORS.ichimokuKijun, values: enrichedHistory.map((p) => p.ichimokuKijun), strokeWidth: 1.9 },
            );
        }
        return series;
    }, [activeOverlayIndicators, enrichedHistory, t]);

    const candlestickOverlays = useMemo<CandlestickOverlay[]>(() => {
        const overlays: CandlestickOverlay[] = [];
        const shiftedSenkouA = enrichedHistory.map((point) => ({ date: addBusinessDays(point.date, 26), value: point.ichimokuSenkouA }));
        const shiftedSenkouB = enrichedHistory.map((point) => ({ date: addBusinessDays(point.date, 26), value: point.ichimokuSenkouB }));
        const addOverlay = (key: string, label: string, color: string, values: Array<number | null>, lineWidth: number, lineStyle?: number) => {
            if (activeOverlayIndicators.includes(key as OverlayIndicatorKey)) overlays.push({ key, label, color, values, lineWidth, lineStyle } as CandlestickOverlay);
        };
        addOverlay("sma20", "SMA 20", INDICATOR_COLORS.sma20, enrichedHistory.map((p) => p.sma20), 2.2);
        addOverlay("sma50", "SMA 50", INDICATOR_COLORS.sma50, enrichedHistory.map((p) => p.sma50), 2.2);
        addOverlay("sma200", "SMA 200", INDICATOR_COLORS.sma200, enrichedHistory.map((p) => p.sma200), 2, LineStyle.Dashed);
        addOverlay("ema12", "EMA 12", INDICATOR_COLORS.ema12, enrichedHistory.map((p) => p.ema12), 2);
        addOverlay("ema26", "EMA 26", INDICATOR_COLORS.ema26, enrichedHistory.map((p) => p.ema26), 2);
        if (activeOverlayIndicators.includes("bollinger")) {
            overlays.push(
                { key: "bollingerUpper", label: t("analysis.chart.bollingerUpper"), color: INDICATOR_COLORS.bollingerUpper, values: enrichedHistory.map((p) => p.bollingerUpper), lineWidth: 1.7, lineStyle: LineStyle.Dashed },
                { key: "bollingerMiddle", label: t("analysis.chart.bollingerMiddle"), color: INDICATOR_COLORS.bollingerMiddle, values: enrichedHistory.map((p) => p.bollingerMiddle), lineWidth: 1.9 },
                { key: "bollingerLower", label: t("analysis.chart.bollingerLower"), color: INDICATOR_COLORS.bollingerLower, values: enrichedHistory.map((p) => p.bollingerLower), lineWidth: 1.7, lineStyle: LineStyle.Dashed },
            );
        }
        if (activeOverlayIndicators.includes("ichimoku")) {
            overlays.push(
                { key: "ichimokuTenkan", label: "Tenkan", color: INDICATOR_COLORS.ichimokuTenkan, values: enrichedHistory.map((p) => p.ichimokuTenkan), lineWidth: 1.8 },
                { key: "ichimokuKijun", label: "Kijun", color: INDICATOR_COLORS.ichimokuKijun, values: enrichedHistory.map((p) => p.ichimokuKijun), lineWidth: 1.8 },
                { key: "ichimokuSenkouA", label: "Senkou A", color: INDICATOR_COLORS.ichimokuSenkouA, points: shiftedSenkouA, lineWidth: 1.6 },
                { key: "ichimokuSenkouB", label: "Senkou B", color: INDICATOR_COLORS.ichimokuSenkouB, points: shiftedSenkouB, lineWidth: 1.6 },
            );
        }
        return overlays;
    }, [activeOverlayIndicators, enrichedHistory, t]);

    const candlestickClouds = useMemo<CandlestickCloud[]>(() =>
        activeOverlayIndicators.includes("ichimoku") ? [{
            key: "ichimoku-cloud",
            upper: enrichedHistory.map((point) => ({ date: addBusinessDays(point.date, 26), value: point.ichimokuSenkouA })),
            lower: enrichedHistory.map((point) => ({ date: addBusinessDays(point.date, 26), value: point.ichimokuSenkouB })),
            bullishColor: "rgba(91, 184, 112, 0.16)",
            bearishColor: "rgba(224, 88, 88, 0.14)",
        }] : [],
        [activeOverlayIndicators, enrichedHistory],
    );

    const indicatorSnapshot = latestIndicator ?? indicatorHistoryData.at(-1) ?? null;
    const latestHistoryIndicator = indicatorHistoryData.at(-1) ?? null;
    const previousHistoryIndicator = indicatorHistoryData.at(-2) ?? null;

    const metricCards = useMemo(() => [
        { label: resolvedType === "stocks" ? t("analysis.metrics.lastClose") : t("analysis.metrics.lastValue"), value: formatValueByType(resolvedType, latestPoint?.close ?? null) },
        { label: t("analysis.metrics.open"), value: formatValueByType(resolvedType, latestPoint?.open ?? null) },
        { label: t("analysis.metrics.high"), value: formatValueByType(resolvedType, latestPoint?.high ?? null) },
        { label: t("analysis.metrics.low"), value: formatValueByType(resolvedType, latestPoint?.low ?? null) },
        { label: t("analysis.metrics.volume"), value: formatCompactNumber(latestPoint?.volume ?? null) },
    ], [latestPoint, resolvedType, t]);

    const indicatorSnapshotCards = useMemo(
        () => resolvedType === "stocks" ? [
            { label: "RSI", value: formatIndicatorSnapshotValue(indicatorSnapshot?.rsi14, 1), note: getRsiComment(indicatorSnapshot?.rsi14), context: getRsiContext(indicatorSnapshot?.rsi14) },
            { label: "MACD", value: formatIndicatorSnapshotValue(latestHistoryIndicator?.macdHistogram, 2), note: getMomentumComment(indicatorSnapshot?.macdHistogram), context: getMacdContext(latestHistoryIndicator?.macdHistogram, previousHistoryIndicator?.macdHistogram) },
            { label: "Stochastic", value: formatIndicatorSnapshotValue(indicatorSnapshot?.stochasticK, 1), note: getStochasticComment(indicatorSnapshot?.stochasticK), context: getStochasticContext(indicatorSnapshot?.stochasticK, indicatorSnapshot?.stochasticD) },
        ] : [],
        [indicatorSnapshot, latestHistoryIndicator, previousHistoryIndicator, resolvedType],
    );

    return {
        isHistoryLoading,
        historyError,
        historyData,
        enrichedHistory,
        latestPoint,
        periodChange,
        dates,
        candlestickData,
        priceSeries,
        candlestickOverlays,
        candlestickClouds,
        isIndicatorHistoryLoading,
        indicatorHistoryError,
        indicatorHistoryData,
        metricCards,
        indicatorSnapshotCards,
    };
}
