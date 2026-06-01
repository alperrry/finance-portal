import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import type {
    CandlestickTooltipIndicator,
    ChartDrawingPoint,
} from "../../../components/charts/CandlestickChart";
import { useDrawings } from "../../../hooks/useDrawings";
import type { CreateDrawingRequest, DrawingType } from "../api/drawingsApi";
import { useAnalysisCatalog } from "./useAnalysisCatalog";
import { useAnalysisComparison } from "./useAnalysisComparison";
import { useAnalysisHistory } from "./useAnalysisHistory";
import {
    CHART_COLORS,
    DEFAULT_DRAWING_STYLE,
    OVERLAY_INDICATOR_OPTIONS,
} from "../types";
import type { ChartType, DrawingTool, OverlayIndicatorKey } from "../types";
import {
    findFirstAvailableType,
    formatValueByType,
    getRangeDates,
    parseRange,
    parseType,
    sanitizeCompareCodes,
    toDrawingInstrumentType,
} from "../utils/analysisFormatters";

export function useAnalysisPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSearch = searchParams.toString();
    const chartPanelRef = useRef<HTMLElement | null>(null);
    const [chartType, setChartType] = useState<ChartType>("candle");
    const [drawingTool, setDrawingTool] = useState<DrawingTool>("select");
    const [drawingDraft, setDrawingDraft] = useState<ChartDrawingPoint | null>(null);
    const [activeOverlayIndicators, setActiveOverlayIndicators] = useState<OverlayIndicatorKey[]>(["sma20", "sma50"]);
    const [isChartFullscreen, setIsChartFullscreen] = useState(false);
    const [comparePanelOpen, setComparePanelOpen] = useState(false);

    const catalogState = useAnalysisCatalog();
    const today = useMemo(() => new Date(), []);
    const requestedType = parseType(searchParams.get("type"));
    const selectedRange = parseRange(searchParams.get("range"));

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsChartFullscreen(document.fullscreenElement === chartPanelRef.current);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const fallbackType = useMemo(() => findFirstAvailableType(catalogState.data), [catalogState.data]);
    const resolvedType = useMemo(() => {
        if (requestedType && catalogState.data[requestedType].length > 0) return requestedType;
        return fallbackType;
    }, [catalogState.data, fallbackType, requestedType]);

    const instrumentOptions = catalogState.data[resolvedType];
    const requestedCode = searchParams.get("code") ?? "";
    const resolvedCode = useMemo(() => {
        if (instrumentOptions.some((option) => option.code === requestedCode)) return requestedCode;
        return instrumentOptions[0]?.code ?? "";
    }, [instrumentOptions, requestedCode]);
    const drawingInstrumentType = useMemo(() => toDrawingInstrumentType(resolvedType), [resolvedType]);
    const {
        drawings,
        loading: drawingsLoading,
        mutating: drawingsMutating,
        add: addDrawing,
        clearAll: clearAllInstrumentDrawings,
    } = useDrawings(drawingInstrumentType, resolvedCode);

    const compareExtras = useMemo(
        () => sanitizeCompareCodes(searchParams.get("compare"), instrumentOptions, resolvedCode),
        [instrumentOptions, resolvedCode, searchParams],
    );

    useEffect(() => {
        if (compareExtras.length > 0) {
            const timer = window.setTimeout(() => setComparePanelOpen(true), 0);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [compareExtras.length]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDrawingDraft(null);
            setDrawingTool("select");
        }, 0);
        return () => window.clearTimeout(timer);
    }, [drawingInstrumentType, resolvedCode]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setDrawingDraft(null);
                setDrawingTool("select");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const rangeDates = useMemo(() => getRangeDates(selectedRange, today), [selectedRange, today]);

    const nextSearch = useMemo(() => {
        const params = new URLSearchParams(searchParams);
        params.set("type", resolvedType);
        params.set("range", selectedRange);
        if (resolvedCode) params.set("code", resolvedCode);
        else params.delete("code");
        if (compareExtras.length > 0) params.set("compare", compareExtras.join(","));
        else params.delete("compare");
        return params.toString();
    }, [compareExtras, resolvedCode, resolvedType, searchParams, selectedRange]);

    useEffect(() => {
        if (catalogState.loading) return;
        if (nextSearch === currentSearch) return;
        setSearchParams(new URLSearchParams(nextSearch), { replace: true });
    }, [catalogState.loading, currentSearch, nextSearch, setSearchParams]);

    const history = useAnalysisHistory({ resolvedType, resolvedCode, rangeDates, activeOverlayIndicators });

    const comparisonCodes = useMemo(() => (resolvedCode ? [resolvedCode, ...compareExtras] : []), [compareExtras, resolvedCode]);
    const comparison = useAnalysisComparison({ comparePanelOpen, comparisonCodes, resolvedType, rangeDates, instrumentOptions });

    const candlestickTooltipIndicators = useMemo<CandlestickTooltipIndicator[]>(
        () => history.candlestickOverlays
            .filter((item): item is typeof item & { values: Array<number | null> } => Boolean(item.values))
            .map((item) => ({
                key: item.key,
                label: item.label,
                color: item.color,
                values: item.values,
                formatter: (value: number) => formatValueByType(resolvedType, value),
            })),
        [history.candlestickOverlays, resolvedType],
    );

    const supportsCandlestick = resolvedType === "stocks";
    const effectiveChartType = supportsCandlestick ? chartType : "line";
    const chartLegendSeries = useMemo(() => [
        { key: "price", label: t("analysis.chart.price"), color: CHART_COLORS.price },
        ...OVERLAY_INDICATOR_OPTIONS
            .filter((option) => activeOverlayIndicators.includes(option.key))
            .map((option) => ({ key: option.key, label: option.label, color: option.color })),
    ], [activeOverlayIndicators, t]);
    const drawingBusy = drawingsLoading || drawingsMutating;
    const drawingToolsDisabled = !supportsCandlestick || !resolvedCode || history.isHistoryLoading || history.enrichedHistory.length === 0;

    useEffect(() => {
        if (effectiveChartType !== "candle") {
            const timer = window.setTimeout(() => {
                setDrawingDraft(null);
                setDrawingTool("select");
            }, 0);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [effectiveChartType]);

    const createDrawingRequest = (drawingType: DrawingType, drawingData: Record<string, unknown>): CreateDrawingRequest => {
        const style = DEFAULT_DRAWING_STYLE[drawingType];
        return {
            instrumentType: drawingInstrumentType,
            instrumentCode: resolvedCode,
            drawingType,
            drawingData: JSON.stringify(drawingData),
            color: style.color,
            lineWidth: style.lineWidth,
        };
    };

    const handleDrawingToolSelect = (tool: DrawingTool) => {
        setDrawingDraft(null);
        if (tool === "select") {
            setDrawingTool("select");
            return;
        }
        if (drawingToolsDisabled || drawingBusy) return;
        setChartType("candle");
        setDrawingTool(tool);
    };

    const handleDrawingPoint = async (point: ChartDrawingPoint) => {
        if (drawingTool === "select" || drawingToolsDisabled || drawingBusy) return;
        if (drawingTool === "HORIZONTAL_LINE") {
            try {
                await addDrawing(createDrawingRequest("HORIZONTAL_LINE", { price: point.price }));
                setDrawingDraft(null);
                setDrawingTool("select");
            } catch {
                /* Toast is emitted by useDrawings. */
            }
            return;
        }
        if (!drawingDraft) {
            setDrawingDraft(point);
            return;
        }
        const drawingType = drawingTool;
        try {
            await addDrawing(createDrawingRequest(drawingType, { points: [drawingDraft, point] }));
            setDrawingDraft(null);
            setDrawingTool("select");
        } catch {
            /* Toast is emitted by useDrawings. */
        }
    };

    const handleClearDrawings = async () => {
        if (drawingBusy || drawings.length === 0) return;
        if (!window.confirm(t("analysis.drawings.deleteAllConfirm"))) return;
        setDrawingDraft(null);
        try {
            await clearAllInstrumentDrawings();
            setDrawingTool("select");
        } catch {
            /* Toast is emitted by useDrawings. */
        }
    };

    const latestDate = history.latestPoint?.date ?? history.historyData?.to ?? null;
    const selectedOption = useMemo(
        () => instrumentOptions.find((option) => option.code === resolvedCode) ?? null,
        [instrumentOptions, resolvedCode],
    );

    const updateSearchParam = (updater: (params: URLSearchParams) => void) => {
        const next = new URLSearchParams(searchParams);
        updater(next);
        setSearchParams(next);
    };

    const toggleChartFullscreen = async () => {
        const element = chartPanelRef.current;
        if (!element) return;
        try {
            if (document.fullscreenElement === element) {
                await document.exitFullscreen();
                return;
            }
            await element.requestFullscreen();
        } catch {
            setIsChartFullscreen(false);
        }
    };

    const setChartPanelElement = (element: HTMLElement | null) => {
        chartPanelRef.current = element;
    };

    return {
        catalog: catalogState,
        selection: {
            resolvedType,
            resolvedCode,
            selectedRange,
            rangeDates,
            instrumentOptions,
            selectedOption,
            latestDate,
            compareExtras,
            comparisonCodes,
        },
        history,
        comparison,
        chart: {
            chartType,
            effectiveChartType,
            supportsCandlestick,
            activeOverlayIndicators,
            chartLegendSeries,
            candlestickTooltipIndicators,
        },
        drawings: {
            drawings,
            drawingTool,
            drawingDraft,
            drawingBusy,
            drawingToolsDisabled,
        },
        fullscreen: {
            isChartFullscreen,
        },
        comparisonPanel: {
            open: comparePanelOpen,
        },
        handlers: {
            setChartType,
            setActiveOverlayIndicators,
            setComparePanelOpen,
            updateSearchParam,
            toggleChartFullscreen,
            setChartPanelElement,
            handleDrawingToolSelect,
            handleDrawingPoint,
            handleClearDrawings,
            setCompareDraftCode: comparison.setCompareDraftCode,
        },
    };
}

export type AnalysisPageState = ReturnType<typeof useAnalysisPage>;
