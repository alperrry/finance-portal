import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { LineStyle } from "lightweight-charts";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
    fetchHistoryCompare,
    fetchInstrumentHistory,
    type CompareResponse,
    type HistoryPoint,
    type HistoryResponse,
    type InstrumentType,
} from "../api/history";
import {
    fetchBonds,
    fetchFunds,
    fetchFx,
    fetchStocks,
    type BondResponse,
    type FundResponse,
    type FxResponse,
    type StockResponse,
} from "../api/market";
import {
    CandlestickChart,
    type CandlestickCloud,
    type CandlestickDrawingMode,
    type CandlestickOverlay,
    type CandlestickPoint,
    type ChartDrawingPoint,
} from "../components/charts/CandlestickChart";
import { getIndicatorHistory, getLatestIndicator } from "../api/indicators";
import { KapitalShell } from "../components/layout";
import { useDrawings } from "../hooks/useDrawings";
import type { StockIndicator } from "../types/indicator";
import type {
    CreateDrawingRequest,
    DrawingType,
    InstrumentType as DrawingInstrumentType,
} from "../api/drawings";
import "./AnalysisPage.css";

type RangeKey = "1A" | "3A" | "6A" | "1Y";
type ChartType = "line" | "candle";
type DrawingTool = CandlestickDrawingMode;
type OverlayIndicatorKey =
    | "sma20"
    | "sma50"
    | "sma200"
    | "ema12"
    | "ema26"
    | "bollinger"
    | "ichimoku";

type InstrumentOption = {
    code: string;
    name: string;
    detail: string;
};

type InstrumentCatalog = Record<InstrumentType, InstrumentOption[]>;

type RequestState<T> = {
    resolvedKey: string;
    data: T | null;
    error: string | null;
};

type EnrichedHistoryPoint = HistoryPoint & {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema26: number | null;
    rsi14: number | null;
    macdHistogram: number | null;
    bollingerUpper: number | null;
    bollingerMiddle: number | null;
    bollingerLower: number | null;
    stochasticK: number | null;
    stochasticD: number | null;
    ichimokuTenkan: number | null;
    ichimokuKijun: number | null;
    ichimokuSenkouA: number | null;
    ichimokuSenkouB: number | null;
    bbMiddle: number | null;
    bbUpper: number | null;
    bbLower: number | null;
};

type ChartSeries = {
    key: string;
    label: string;
    color: string;
    values: Array<number | null>;
    strokeWidth?: number;
    dashArray?: string;
};

type ReferenceLine = {
    value: number;
    label: string;
    color?: string;
    dashArray?: string;
};

type LineChartProps = {
    dates: string[];
    series: ChartSeries[];
    emptyLabel: string;
    yFormatter?: (value: number) => string;
    fixedDomain?: [number, number];
    referenceLines?: ReferenceLine[];
    tooltipData?: EnrichedHistoryPoint[];
    valueFormatter?: (value: number | null | undefined) => string;
    volumeFormatter?: (value: number | null | undefined) => string;
};

type LineTooltipState = {
    visible: boolean;
    index: number;
    x: number;
    y: number;
    frameWidth: number;
    frameHeight: number;
    chartX: number;
    chartY: number;
    valueAtY: number;
};

type CatalogState = {
    data: InstrumentCatalog;
    loading: boolean;
    error: string | null;
};

const TYPE_ORDER: InstrumentType[] = ["stocks", "fx", "funds", "bonds"];

const TYPE_META: Record<InstrumentType, { label: string; description: string }> = {
    stocks: {
        label: "Hisseler",
        description: "Fiyat, hareketli ortalama ve volatiliteyi tek panelde okuyun.",
    },
    fx: {
        label: "Döviz",
        description: "TCMB serileri üzerinden kur trendlerini ve momentumunu izleyin.",
    },
    funds: {
        label: "Fonlar",
        description: "Fon fiyat serilerini seçili aralıkta karşılaştırın.",
    },
    bonds: {
        label: "Tahvil/Bono",
        description: "Faiz serilerini trend ve bant yapısıyla birlikte analiz edin.",
    },
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; months?: number; days?: number }> = [
    { key: "1A", label: "1A", months: 1 },
    { key: "3A", label: "3A", months: 3 },
    { key: "6A", label: "6A", months: 6 },
    { key: "1Y", label: "1Y", days: 365 },
];

const CHART_COLORS = {
    price: "#111111",
    accent: "#c1622f",
    accentSoft: "#d98b63",
    success: "#5bb870",
    danger: "#e05858",
    muted: "#76808b",
    compare: ["#111111", "#c1622f", "#5bb870"],
};

const INDICATOR_COLORS = {
    sma20: "#c1622f",
    sma50: "#2f8f58",
    sma200: "#5b6472",
    ema12: "#1f78a8",
    ema26: "#7f5aa2",
    bollingerUpper: "#c84b4b",
    bollingerMiddle: "#c1622f",
    bollingerLower: "#3f9f65",
    ichimokuTenkan: "#1f78a8",
    ichimokuKijun: "#8a5a35",
    ichimokuSenkouA: "#4d9b65",
    ichimokuSenkouB: "#d15f5f",
};

const OVERLAY_INDICATOR_OPTIONS: Array<{ key: OverlayIndicatorKey; label: string; color: string }> = [
    { key: "sma20", label: "SMA 20", color: INDICATOR_COLORS.sma20 },
    { key: "sma50", label: "SMA 50", color: INDICATOR_COLORS.sma50 },
    { key: "sma200", label: "SMA 200", color: INDICATOR_COLORS.sma200 },
    { key: "ema12", label: "EMA 12", color: INDICATOR_COLORS.ema12 },
    { key: "ema26", label: "EMA 26", color: INDICATOR_COLORS.ema26 },
    { key: "bollinger", label: "Bollinger", color: INDICATOR_COLORS.bollingerMiddle },
    { key: "ichimoku", label: "Ichimoku", color: INDICATOR_COLORS.ichimokuTenkan },
];

const DEFAULT_DRAWING_STYLE: Record<DrawingType, { color: string; lineWidth: number }> = {
    TREND_LINE: { color: "#FF6B35", lineWidth: 2 },
    HORIZONTAL_LINE: { color: "#3498db", lineWidth: 2 },
    RECTANGLE: { color: "#2ECC71", lineWidth: 2 },
};

const DEFAULT_RANGE: RangeKey = "6A";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
});

const createEmptyCatalog = (): InstrumentCatalog => ({
    stocks: [],
    fx: [],
    funds: [],
    bonds: [],
});

const toSafeNumber = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const formatDecimal = (value: number | null | undefined, digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
};

const formatPercent = (value: number | null | undefined, digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatDecimal(normalized, digits)}%`;
};

const formatCompactNumber = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const absolute = Math.abs(normalized);
    if (absolute >= 1_000_000_000) return `${formatDecimal(normalized / 1_000_000_000, 1)} Mr`;
    if (absolute >= 1_000_000) return `${formatDecimal(normalized / 1_000_000, 1)} Mn`;
    if (absolute >= 1_000) return `${formatDecimal(normalized / 1_000, 1)} Bin`;

    return new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: 0,
    }).format(normalized);
};

const formatDateLabel = (value: string | null | undefined) => {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "-";

    return dateFormatter.format(date);
};

const formatFullDateLabel = (value: string | null | undefined) => {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        weekday: "long",
    })
        .format(date)
        .replaceAll(".", "");
};

const formatShortDateLabel = (value: string | null | undefined) => {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";

    return shortDateFormatter.format(date);
};

const getValueDigits = (type: InstrumentType, value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return type === "funds" ? 4 : 2;

    if (type === "fx") {
        return Math.abs(normalized) >= 10 ? 4 : 5;
    }

    if (type === "funds") {
        return 4;
    }

    return 2;
};

const formatValueByType = (type: InstrumentType, value: number | null | undefined) =>
    formatDecimal(value, getValueDigits(type, value));

const parseType = (value: string | null): InstrumentType | null =>
    value === "stocks" || value === "fx" || value === "funds" || value === "bonds" ? value : null;

const toDrawingInstrumentType = (type: InstrumentType): DrawingInstrumentType => {
    if (type === "fx") return "CURRENCY";
    if (type === "funds") return "FUND";
    if (type === "bonds") return "BOND";
    return "STOCK";
};

const parseRange = (value: string | null): RangeKey =>
    value === "1A" || value === "3A" || value === "6A" || value === "1Y" ? value : DEFAULT_RANGE;

const subtractMonths = (date: Date, months: number) => {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() - months);

    const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, maxDay));

    return result;
};

const subtractDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
};

const toIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const addBusinessDays = (isoDate: string, days: number) => {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;

    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) {
            added += 1;
        }
    }

    return toIsoDate(date);
};

const getRangeDates = (range: RangeKey, today: Date) => {
    const config = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[2];
    const to = new Date(today);
    const from = config.months ? subtractMonths(to, config.months) : subtractDays(to, config.days ?? 365);

    return {
        from: toIsoDate(from),
        to: toIsoDate(to),
    };
};

function emitIndicatorError(message: string, error: unknown) {
    if (error instanceof ApiError && error.status === 401) return;

    window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, tone: "error" } }));
}

const computeSma = (values: Array<number | null>, period: number) =>
    values.map((_, index) => {
        if (index + 1 < period) return null;

        const window = values.slice(index - period + 1, index + 1);
        const safeWindow = window.filter((value): value is number => value !== null);
        if (safeWindow.length !== period) return null;

        const total = safeWindow.reduce((sum, value) => sum + value, 0);
        return total / period;
    });

const computeRollingStdDev = (values: Array<number | null>, period: number, means: Array<number | null>) =>
    values.map((_, index) => {
        const mean = means[index];
        if (index + 1 < period || mean === null) return null;

        const window = values.slice(index - period + 1, index + 1);
        const safeWindow = window.filter((value): value is number => value !== null);
        if (safeWindow.length !== period) return null;

        const variance =
            safeWindow.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;

        return Math.sqrt(variance);
    });

const computeRsi = (values: Array<number | null>, period: number) =>
    values.map((value, index) => {
        if (value === null || index === 0 || index < period) return null;

        let gainTotal = 0;
        let lossTotal = 0;

        for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
            const current = values[cursor];
            const previous = values[cursor - 1];

            if (current === null || previous === null) {
                return null;
            }

            const delta = current - previous;
            if (delta > 0) {
                gainTotal += delta;
            } else {
                lossTotal += Math.abs(delta);
            }
        }

        const averageGain = gainTotal / period;
        const averageLoss = lossTotal / period;

        if (averageGain === 0 && averageLoss === 0) return 50;
        if (averageLoss === 0) return 100;
        if (averageGain === 0) return 0;

        const relativeStrength = averageGain / averageLoss;
        return 100 - 100 / (1 + relativeStrength);
    });

const buildEnrichedHistory = (points: HistoryPoint[], indicators: StockIndicator[] = []): EnrichedHistoryPoint[] => {
    const closes = points.map((point) => toSafeNumber(point.close));
    const sma20 = computeSma(closes, 20);
    const sma50 = computeSma(closes, 50);
    const bbMiddle = sma20;
    const bbStdDev = computeRollingStdDev(closes, 20, bbMiddle);
    const rsi14 = computeRsi(closes, 14);
    const indicatorByDate = new Map(indicators.map((indicator) => [indicator.tradeDate, indicator]));

    return points.map((point, index) => {
        const indicator = indicatorByDate.get(point.date);
        const bandDeviation = bbStdDev[index];
        const fallbackMiddle = bbMiddle[index];
        const fallbackUpper = fallbackMiddle !== null && bandDeviation !== null ? fallbackMiddle + bandDeviation * 2 : null;
        const fallbackLower = fallbackMiddle !== null && bandDeviation !== null ? fallbackMiddle - bandDeviation * 2 : null;
        const bollingerMiddle = indicator?.bollingerMiddle ?? fallbackMiddle;
        const bollingerUpper = indicator?.bollingerUpper ?? fallbackUpper;
        const bollingerLower = indicator?.bollingerLower ?? fallbackLower;

        return {
            ...point,
            sma20: indicator?.sma20 ?? sma20[index],
            sma50: indicator?.sma50 ?? sma50[index],
            sma200: indicator?.sma200 ?? null,
            ema12: indicator?.ema12 ?? null,
            ema26: indicator?.ema26 ?? null,
            rsi14: indicator?.rsi14 ?? rsi14[index],
            macdHistogram: indicator?.macdHistogram ?? null,
            bollingerUpper,
            bollingerMiddle,
            bollingerLower,
            stochasticK: indicator?.stochasticK ?? null,
            stochasticD: indicator?.stochasticD ?? null,
            ichimokuTenkan: indicator?.ichimokuTenkan ?? null,
            ichimokuKijun: indicator?.ichimokuKijun ?? null,
            ichimokuSenkouA: indicator?.ichimokuSenkouA ?? null,
            ichimokuSenkouB: indicator?.ichimokuSenkouB ?? null,
            bbMiddle: bollingerMiddle,
            bbUpper: bollingerUpper,
            bbLower: bollingerLower,
        };
    });
};

const calculatePeriodChange = (points: Array<{ close: number | null }>) => {
    const first = points.find((point) => toSafeNumber(point.close) !== null)?.close ?? null;
    const last = [...points].reverse().find((point) => toSafeNumber(point.close) !== null)?.close ?? null;

    if (first === null || last === null || first === 0) {
        return null;
    }

    return ((last - first) / first) * 100;
};

const getTickIndexes = (length: number, tickCount: number) => {
    if (length <= 0) return [];
    if (length === 1) return [0];

    const indexes = new Set<number>();
    for (let index = 0; index < tickCount; index += 1) {
        indexes.add(Math.round((index / (tickCount - 1)) * (length - 1)));
    }

    return Array.from(indexes).sort((left, right) => left - right);
};

const getLinearTicks = (minimum: number, maximum: number, count: number) => {
    if (count <= 1) return [minimum];
    if (minimum === maximum) return [minimum];

    return Array.from({ length: count }, (_, index) => maximum - ((maximum - minimum) * index) / (count - 1));
};

const createLinePath = (values: Array<number | null>, xAt: (index: number) => number, yAt: (value: number) => number) => {
    let path = "";
    let openSegment = false;

    values.forEach((value, index) => {
        if (value === null) {
            openSegment = false;
            return;
        }

        const command = openSegment ? "L" : "M";
        path += `${command}${xAt(index).toFixed(2)},${yAt(value).toFixed(2)} `;
        openSegment = true;
    });

    return path.trim();
};

const buildCatalogFromStocks = (rows: StockResponse[]) =>
    [...rows]
        .map((row) => ({
            code: row.symbol,
            name: row.longName ?? row.shortName ?? row.symbol,
            detail: row.sector ?? row.indexName ?? "Hisse",
        }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

const buildCatalogFromFx = (rows: FxResponse[]) =>
    [...rows]
        .map((row) => ({
            code: row.currencyCode,
            name: row.currencyName,
            detail: `TCMB · ${row.unit > 1 ? `${row.unit} birim` : "1 birim"}`,
        }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

const buildCatalogFromFunds = (rows: FundResponse[]) =>
    [...rows]
        .map((row) => ({
            code: row.code,
            name: row.name,
            detail: row.fundType ?? "Fon",
        }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

const buildCatalogFromBonds = (rows: BondResponse[]) =>
    [...rows]
        .map((row) => ({
            code: row.evdsSeriesCode,
            name: row.name,
            detail: row.currency ?? row.bondType ?? "Tahvil/Bono",
        }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

const sanitizeCompareCodes = (value: string | null, options: InstrumentOption[], currentCode: string) => {
    if (!value) return [];

    const available = new Set(options.map((option) => option.code));
    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index)
        .filter((item) => item !== currentCode && available.has(item))
        .slice(0, 2);
};

const findFirstAvailableType = (catalog: InstrumentCatalog) =>
    TYPE_ORDER.find((type) => catalog[type].length > 0) ?? "stocks";

const buildComparisonChartData = (
    selectedCodes: string[],
    response: CompareResponse | null,
    options: InstrumentOption[]
) => {
    if (!response) {
        return {
            dates: [] as string[],
            series: [] as ChartSeries[],
        };
    }

    const optionMap = new Map(options.map((option) => [option.code, option]));
    const dateSet = new Set<string>();

    selectedCodes.forEach((code) => {
        (response.series[code] ?? []).forEach((point) => {
            if (point.date) {
                dateSet.add(point.date);
            }
        });
    });

    const dates = Array.from(dateSet).sort((left, right) => left.localeCompare(right));
    const series = selectedCodes.map((code, index) => {
        const rawSeries = response.series[code] ?? [];
        const baseClose = rawSeries.find((point) => toSafeNumber(point.close) !== null)?.close ?? null;
        const valueByDate = new Map(rawSeries.map((point) => [point.date, toSafeNumber(point.close)]));

        return {
            key: code,
            label: optionMap.get(code)?.name ?? code,
            color: CHART_COLORS.compare[index % CHART_COLORS.compare.length],
            values: dates.map((date) => {
                const current = valueByDate.get(date) ?? null;
                if (current === null || baseClose === null || baseClose === 0) return null;
                return ((current - baseClose) / baseClose) * 100;
            }),
            strokeWidth: 2.4,
        };
    });

    return { dates, series };
};

function LineChart({
    dates,
    series,
    emptyLabel,
    yFormatter,
    fixedDomain,
    referenceLines = [],
    tooltipData = [],
    valueFormatter,
    volumeFormatter = formatCompactNumber,
}: LineChartProps) {
    const frameRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [tooltip, setTooltip] = useState<LineTooltipState | null>(null);
    const tooltipRafRef = useRef<number | null>(null);
    const pendingTooltipRef = useRef<LineTooltipState | null>(null);
    const width = 960;
    const height = 340;
    const padding = { top: 20, right: 18, bottom: 34, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const formatTooltipValue = valueFormatter ?? ((value) => formatDecimal(value, 2));

    const scheduleTooltip = (nextTooltip: LineTooltipState | null) => {
        pendingTooltipRef.current = nextTooltip;
        if (tooltipRafRef.current !== null) return;

        tooltipRafRef.current = window.requestAnimationFrame(() => {
            tooltipRafRef.current = null;
            setTooltip(pendingTooltipRef.current);
            pendingTooltipRef.current = null;
        });
    };

    useEffect(
        () => () => {
            if (tooltipRafRef.current !== null) {
                window.cancelAnimationFrame(tooltipRafRef.current);
            }
        },
        []
    );

    const values = series.flatMap((item) => item.values).filter((value): value is number => value !== null);
    const extraValues = referenceLines.map((line) => line.value);
    const domainValues = [...values, ...extraValues];

    if (domainValues.length === 0) {
        return (
            <div className="analysis-chart-empty">
                <strong>Grafik hazır değil</strong>
                <span>{emptyLabel}</span>
            </div>
        );
    }

    let minimum = fixedDomain ? fixedDomain[0] : Math.min(...domainValues);
    let maximum = fixedDomain ? fixedDomain[1] : Math.max(...domainValues);

    if (!fixedDomain) {
        const span = maximum - minimum;
        const paddingValue = span === 0 ? Math.max(Math.abs(maximum) * 0.08, 1) : span * 0.12;
        minimum -= paddingValue;
        maximum += paddingValue;
    }

    if (minimum === maximum) {
        minimum -= 1;
        maximum += 1;
    }

    const xAt = (index: number) =>
        padding.left + (index / Math.max(dates.length - 1, 1)) * innerWidth;

    const yAt = (value: number) =>
        padding.top + ((maximum - value) / (maximum - minimum)) * innerHeight;

    const xTicks = getTickIndexes(dates.length, Math.min(5, dates.length));
    const yTicks = getLinearTicks(minimum, maximum, 5);
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const updateTooltipFromPointer = (event: PointerEvent<SVGSVGElement>, toggleTouch = false) => {
        const svg = svgRef.current;
        const frame = frameRef.current;
        if (!svg || !frame || dates.length === 0) return;

        const svgRect = svg.getBoundingClientRect();
        const frameRect = frame.getBoundingClientRect();
        if (svgRect.width <= 0 || svgRect.height <= 0) return;

        const viewX = ((event.clientX - svgRect.left) / svgRect.width) * width;
        const viewY = ((event.clientY - svgRect.top) / svgRect.height) * height;
        const rawIndex = Math.round(((viewX - padding.left) / innerWidth) * Math.max(dates.length - 1, 1));
        const index = clamp(rawIndex, 0, dates.length - 1);

        if (toggleTouch && tooltip?.index === index) {
            scheduleTooltip(null);
            return;
        }

        const chartX = xAt(index);
        const chartY = clamp(viewY, padding.top, padding.top + innerHeight);
        const valueAtY = maximum - ((chartY - padding.top) / innerHeight) * (maximum - minimum);

        scheduleTooltip({
            visible: true,
            index,
            x: event.clientX - frameRect.left,
            y: event.clientY - frameRect.top,
            frameWidth: frameRect.width,
            frameHeight: frameRect.height,
            chartX,
            chartY,
            valueAtY,
        });
    };

    const tooltipPoint = tooltip ? tooltipData[tooltip.index] : undefined;
    const tooltipSeriesRows = tooltip
        ? series
              .map((item) => ({
                  key: item.key,
                  label: item.label,
                  color: item.color,
                  value: item.values[tooltip.index],
              }))
              .filter((item): item is { key: string; label: string; color: string; value: number } => item.value !== null)
        : [];

    const tooltipIndicatorRows = tooltipPoint ? tooltipSeriesRows.filter((row) => row.key !== "close") : [];
    const tooltipWidth = 232;
    const tooltipHeight = tooltipPoint ? 150 + tooltipIndicatorRows.length * 19 : 70 + tooltipSeriesRows.length * 19;
    const tooltipX =
        tooltip
            ? clamp(
                  tooltip.x > tooltip.frameWidth / 2 ? tooltip.x - tooltipWidth - 16 : tooltip.x + 16,
                  8,
                  Math.max(8, tooltip.frameWidth - tooltipWidth - 8)
              )
            : 0;
    const tooltipY =
        tooltip
            ? clamp(
                  tooltip.y > tooltip.frameHeight / 2 ? tooltip.y - tooltipHeight - 16 : tooltip.y + 16,
                  8,
                  Math.max(8, tooltip.frameHeight - tooltipHeight - 8)
              )
            : 0;
    const priceLabel = tooltip ? (yFormatter ? yFormatter(tooltip.valueAtY) : formatTooltipValue(tooltip.valueAtY)) : "";
    const dateLabel = tooltip ? formatShortDateLabel(dates[tooltip.index]) : "";
    const dateLabelX = tooltip ? clamp(tooltip.chartX - 32, padding.left, width - padding.right - 64) : 0;

    return (
        <div ref={frameRef} className="analysis-chart-frame analysis-line-chart-frame">
            <svg
                ref={svgRef}
                className="analysis-chart-svg"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                role="img"
                onPointerMove={(event) => {
                    if (event.pointerType === "mouse") {
                        updateTooltipFromPointer(event);
                    }
                }}
                onPointerDown={(event) => {
                    if (event.pointerType !== "mouse") {
                        updateTooltipFromPointer(event, true);
                    }
                }}
                onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") {
                        scheduleTooltip(null);
                    }
                }}
            >
                <defs>
                    <linearGradient id="analysis-grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(17,17,17,0.16)" />
                        <stop offset="100%" stopColor="rgba(17,17,17,0.04)" />
                    </linearGradient>
                </defs>

                <rect
                    x={padding.left}
                    y={padding.top}
                    width={innerWidth}
                    height={innerHeight}
                    rx="18"
                    fill="rgba(255,255,255,0.74)"
                />

                {yTicks.map((tick) => (
                    <g key={`y-${tick.toFixed(4)}`}>
                        <line
                            x1={padding.left}
                            y1={yAt(tick)}
                            x2={width - padding.right}
                            y2={yAt(tick)}
                            stroke="url(#analysis-grid-fade)"
                            strokeWidth="1"
                        />
                        <text className="analysis-chart-axis" x={padding.left - 10} y={yAt(tick) + 4} textAnchor="end">
                            {yFormatter ? yFormatter(tick) : formatDecimal(tick, 2)}
                        </text>
                    </g>
                ))}

                {referenceLines.map((line) => (
                    <g key={`${line.label}-${line.value}`}>
                        <line
                            x1={padding.left}
                            y1={yAt(line.value)}
                            x2={width - padding.right}
                            y2={yAt(line.value)}
                            stroke={line.color ?? "rgba(17,17,17,0.34)"}
                            strokeWidth="1.2"
                            strokeDasharray={line.dashArray ?? "6 6"}
                        />
                        <text
                            className="analysis-chart-reference"
                            x={width - padding.right - 8}
                            y={yAt(line.value) - 6}
                            textAnchor="end"
                        >
                            {line.label}
                        </text>
                    </g>
                ))}

                {series.map((item) => {
                    const path = createLinePath(item.values, xAt, yAt);

                    if (!path) {
                        return null;
                    }

                    return (
                        <path
                            key={item.key}
                            d={path}
                            fill="none"
                            stroke={item.color}
                            strokeWidth={item.strokeWidth ?? 2.6}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeDasharray={item.dashArray}
                        />
                    );
                })}

                {tooltip ? (
                    <g className="analysis-line-crosshair">
                        <line
                            x1={tooltip.chartX}
                            y1={padding.top}
                            x2={tooltip.chartX}
                            y2={padding.top + innerHeight}
                        />
                        <line
                            x1={padding.left}
                            y1={tooltip.chartY}
                            x2={width - padding.right}
                            y2={tooltip.chartY}
                        />
                        <rect
                            className="analysis-crosshair-price-bg"
                            x={width - padding.right - 76}
                            y={clamp(tooltip.chartY - 11, padding.top, padding.top + innerHeight - 22)}
                            width="74"
                            height="22"
                            rx="8"
                        />
                        <text
                            className="analysis-crosshair-label"
                            x={width - padding.right - 39}
                            y={clamp(tooltip.chartY + 4, padding.top + 15, padding.top + innerHeight - 7)}
                            textAnchor="middle"
                        >
                            {priceLabel}
                        </text>
                        <rect
                            className="analysis-crosshair-date-bg"
                            x={dateLabelX}
                            y={height - 30}
                            width="64"
                            height="22"
                            rx="8"
                        />
                        <text
                            className="analysis-crosshair-label"
                            x={dateLabelX + 32}
                            y={height - 15}
                            textAnchor="middle"
                        >
                            {dateLabel}
                        </text>
                    </g>
                ) : null}

                {xTicks.map((tickIndex) => (
                    <text
                        key={`x-${tickIndex}`}
                        className="analysis-chart-axis"
                        x={xAt(tickIndex)}
                        y={height - 10}
                        textAnchor={tickIndex === 0 ? "start" : tickIndex === dates.length - 1 ? "end" : "middle"}
                    >
                        {formatShortDateLabel(dates[tickIndex])}
                    </text>
                ))}
            </svg>
            {tooltip ? (
                <div className="analysis-line-tooltip" style={{ transform: `translate(${tooltipX}px, ${tooltipY}px)` }}>
                    <strong>{formatFullDateLabel(dates[tooltip.index])}</strong>
                    {tooltipPoint ? (
                        <>
                            <span>
                                <b>Fiyat</b>
                                <em>{formatTooltipValue(tooltipPoint.close)}</em>
                            </span>
                            <span>
                                <b>Hacim</b>
                                <em>{volumeFormatter(tooltipPoint.volume)}</em>
                            </span>
                            {tooltipIndicatorRows.length > 0 ? <i className="analysis-tooltip-divider" /> : null}
                            {tooltipIndicatorRows.map((row) => (
                                <span key={row.key}>
                                    <b>
                                        <i style={{ backgroundColor: row.color }} />
                                        {row.label}
                                    </b>
                                    <em>{formatTooltipValue(row.value)}</em>
                                </span>
                            ))}
                        </>
                    ) : (
                        tooltipSeriesRows.map((row) => (
                            <span key={row.key}>
                                <b>
                                    <i style={{ backgroundColor: row.color }} />
                                    {row.label}
                                </b>
                                <em>{yFormatter ? yFormatter(row.value) : formatTooltipValue(row.value)}</em>
                            </span>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}

function MaximizeIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
    );
}

function MinimizeIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        </svg>
    );
}

function MousePointerIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 3l7.4 17 2.1-7.1L20 10.4 4 3z" />
            <path d="M13.5 13.5l5 5" />
        </svg>
    );
}

function TrendLineIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 18L20 6" />
            <path d="M5 18h.01M19 6h.01" />
        </svg>
    );
}

function HorizontalLineIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 12h14" />
        </svg>
    );
}

function RectangleIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="5" y="5" width="14" height="14" rx="1.5" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 15h10l1-15" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    );
}

type DrawingToolbarProps = {
    activeTool: DrawingTool;
    toolDisabled: boolean;
    busy: boolean;
    canClear: boolean;
    onSelect: (tool: DrawingTool) => void;
    onClear: () => void;
};

function DrawingToolbar({ activeTool, toolDisabled, busy, canClear, onSelect, onClear }: DrawingToolbarProps) {
    const tools: Array<{ key: DrawingTool; label: string; icon: ReactNode }> = [
        { key: "select", label: "Seç", icon: <MousePointerIcon /> },
        { key: "TREND_LINE", label: "Trend çizgisi", icon: <TrendLineIcon /> },
        { key: "HORIZONTAL_LINE", label: "Yatay çizgi", icon: <HorizontalLineIcon /> },
        { key: "RECTANGLE", label: "Dikdörtgen", icon: <RectangleIcon /> },
    ];

    return (
        <div className="analysis-drawing-toolbar" aria-label="Çizim araçları">
            {tools.map((tool) => {
                const disabled = busy || (toolDisabled && tool.key !== "select");
                return (
                    <button
                        key={tool.key}
                        className={`analysis-drawing-tool ${activeTool === tool.key ? "active" : ""}`.trim()}
                        type="button"
                        aria-label={tool.label}
                        title={tool.label}
                        aria-pressed={activeTool === tool.key}
                        disabled={disabled}
                        onClick={() => onSelect(tool.key)}
                    >
                        {tool.icon}
                    </button>
                );
            })}
            <span className="analysis-drawing-divider" aria-hidden="true" />
            <button
                className="analysis-drawing-tool danger"
                type="button"
                aria-label="Tüm çizimleri temizle"
                title="Tümünü temizle"
                disabled={busy || !canClear}
                onClick={onClear}
            >
                {busy ? <span className="analysis-drawing-spinner" aria-hidden="true" /> : <TrashIcon />}
            </button>
        </div>
    );
}

const getRsiComment = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized < 30) return "Aşırı satım";
    if (normalized > 70) return "Aşırı alım";
    return "Nötr";
};

const getMomentumComment = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized > 0) return "Yükseliş momentumu";
    if (normalized < 0) return "Düşüş momentumu";
    return "Nötr";
};

const getStochasticComment = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized > 80) return "Aşırı alım";
    if (normalized < 20) return "Aşırı satım";
    return "Nötr";
};

const getRsiContext = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized > 70) return "Satış baskısı gelebilir";
    if (normalized >= 55) return "Alış baskısı sürüyor";
    if (normalized > 45) return "Yön dengeleniyor";
    if (normalized >= 30) return "Satış baskısı sürüyor";
    return "Tepki alımı izlenebilir";
};

const getMacdContext = (current: number | null | undefined, previous: number | null | undefined) => {
    const currentValue = toSafeNumber(current);
    const previousValue = toSafeNumber(previous);
    if (currentValue === null || previousValue === null) return "Veri yetersiz";
    if (currentValue > 0 && currentValue > previousValue) return "Alış baskısı güçleniyor";
    if (currentValue > 0) return "Alış baskısı sürüyor";
    if (currentValue < 0 && currentValue < previousValue) return "Satış baskısı güçleniyor";
    if (currentValue < 0) return "Satış baskısı sürüyor";
    return "Momentum yatay";
};

const getStochasticContext = (k: number | null | undefined, d: number | null | undefined) => {
    const kValue = toSafeNumber(k);
    const dValue = toSafeNumber(d);
    if (kValue === null || dValue === null) return "Veri yetersiz";
    if (kValue > 80) return "Satış baskısı gelebilir";
    if (kValue < 20) return "Alış baskısı gelebilir";
    if (kValue > dValue) return "Yukarı yönlü";
    if (kValue < dValue) return "Aşağı yönlü";
    return "Yön dengeleniyor";
};

const formatIndicatorSnapshotValue = (value: number | null | undefined, digits: number) =>
    toSafeNumber(value) === null ? "Veri yetersiz" : formatDecimal(value, digits);

export default function AnalysisPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSearch = searchParams.toString();
    const chartPanelRef = useRef<HTMLElement | null>(null);
    const [chartType, setChartType] = useState<ChartType>("candle");
    const [drawingTool, setDrawingTool] = useState<DrawingTool>("select");
    const [drawingDraft, setDrawingDraft] = useState<ChartDrawingPoint | null>(null);
    const [activeOverlayIndicators, setActiveOverlayIndicators] = useState<OverlayIndicatorKey[]>(["sma20", "sma50"]);
    const [isChartFullscreen, setIsChartFullscreen] = useState(false);
    const [comparePanelOpen, setComparePanelOpen] = useState(false);
    const [compareDraftCode, setCompareDraftCode] = useState("");
    const [catalogState, setCatalogState] = useState<CatalogState>({
        data: createEmptyCatalog(),
        loading: true,
        error: null,
    });
    const [historyState, setHistoryState] = useState<RequestState<HistoryResponse>>({
        resolvedKey: "",
        data: null,
        error: null,
    });
    const [compareState, setCompareState] = useState<RequestState<CompareResponse>>({
        resolvedKey: "",
        data: null,
        error: null,
    });
    const [indicatorHistoryState, setIndicatorHistoryState] = useState<RequestState<StockIndicator[]>>({
        resolvedKey: "",
        data: null,
        error: null,
    });
    const [latestIndicatorState, setLatestIndicatorState] = useState<RequestState<StockIndicator>>({
        resolvedKey: "",
        data: null,
        error: null,
    });

    const today = useMemo(() => new Date(), []);
    const requestedType = parseType(searchParams.get("type"));
    const selectedRange = parseRange(searchParams.get("range"));

    useEffect(() => {
        let active = true;

        Promise.allSettled([fetchStocks(), fetchFx(), fetchFunds(), fetchBonds()])
            .then(([stocksResult, fxResult, fundsResult, bondsResult]) => {
                if (!active) return;

                const nextCatalog = createEmptyCatalog();
                const failedGroups: string[] = [];

                if (stocksResult.status === "fulfilled") {
                    nextCatalog.stocks = buildCatalogFromStocks(stocksResult.value);
                } else {
                    failedGroups.push("hisse");
                }

                if (fxResult.status === "fulfilled") {
                    nextCatalog.fx = buildCatalogFromFx(fxResult.value);
                } else {
                    failedGroups.push("döviz");
                }

                if (fundsResult.status === "fulfilled") {
                    nextCatalog.funds = buildCatalogFromFunds(fundsResult.value);
                } else {
                    failedGroups.push("fon");
                }

                if (bondsResult.status === "fulfilled") {
                    nextCatalog.bonds = buildCatalogFromBonds(bondsResult.value);
                } else {
                    failedGroups.push("tahvil");
                }

                const hasAnyOptions = TYPE_ORDER.some((type) => nextCatalog[type].length > 0);
                const error =
                    !hasAnyOptions
                        ? "Enstrüman listeleri yüklenemedi."
                        : failedGroups.length > 0
                          ? `Bazı listeler eksik: ${failedGroups.join(", ")}.`
                          : null;

                setCatalogState({
                    data: nextCatalog,
                    loading: false,
                    error,
                });
            })
            .catch(() => {
                if (!active) return;
                setCatalogState({
                    data: createEmptyCatalog(),
                    loading: false,
                    error: "Enstrüman listeleri yüklenemedi.",
                });
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsChartFullscreen(document.fullscreenElement === chartPanelRef.current);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const fallbackType = useMemo(() => findFirstAvailableType(catalogState.data), [catalogState.data]);
    const resolvedType = useMemo(() => {
        if (requestedType && catalogState.data[requestedType].length > 0) {
            return requestedType;
        }

        return fallbackType;
    }, [catalogState.data, fallbackType, requestedType]);

    const instrumentOptions = catalogState.data[resolvedType];
    const requestedCode = searchParams.get("code") ?? "";
    const resolvedCode = useMemo(() => {
        if (instrumentOptions.some((option) => option.code === requestedCode)) {
            return requestedCode;
        }

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
        [instrumentOptions, resolvedCode, searchParams]
    );

    useEffect(() => {
        if (compareExtras.length > 0) {
            const openTimer = window.setTimeout(() => setComparePanelOpen(true), 0);
            return () => window.clearTimeout(openTimer);
        }

        return undefined;
    }, [compareExtras.length]);

    useEffect(() => {
        const resetTimer = window.setTimeout(() => {
            setDrawingDraft(null);
            setDrawingTool("select");
        }, 0);

        return () => window.clearTimeout(resetTimer);
    }, [drawingInstrumentType, resolvedCode]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;

            setDrawingDraft(null);
            setDrawingTool("select");
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const rangeDates = useMemo(() => getRangeDates(selectedRange, today), [selectedRange, today]);

    const nextSearch = useMemo(() => {
        const params = new URLSearchParams(searchParams);
        params.set("type", resolvedType);
        params.set("range", selectedRange);

        if (resolvedCode) {
            params.set("code", resolvedCode);
        } else {
            params.delete("code");
        }

        if (compareExtras.length > 0) {
            params.set("compare", compareExtras.join(","));
        } else {
            params.delete("compare");
        }

        return params.toString();
    }, [compareExtras, resolvedCode, resolvedType, searchParams, selectedRange]);

    useEffect(() => {
        if (catalogState.loading) return;
        if (nextSearch === currentSearch) return;

        setSearchParams(new URLSearchParams(nextSearch), { replace: true });
    }, [catalogState.loading, currentSearch, nextSearch, setSearchParams]);

    const historyRequestKey = resolvedCode
        ? `${resolvedType}:${resolvedCode}:${rangeDates.from}:${rangeDates.to}`
        : "";
    const indicatorHistoryRequestKey =
        resolvedType === "stocks" && resolvedCode
            ? `stocks:${resolvedCode}:${rangeDates.from}:${rangeDates.to}:indicators`
            : "";
    const latestIndicatorRequestKey =
        resolvedType === "stocks" && resolvedCode ? `stocks:${resolvedCode}:latest-indicator` : "";

    useEffect(() => {
        let active = true;

        const loadHistory = async () => {
            if (!historyRequestKey || !resolvedCode) {
                setHistoryState({
                    resolvedKey: historyRequestKey,
                    data: null,
                    error: null,
                });
                return;
            }

            try {
                const data = await fetchInstrumentHistory(resolvedType, resolvedCode, rangeDates.from, rangeDates.to);
                if (!active) return;

                setHistoryState({
                    resolvedKey: historyRequestKey,
                    data,
                    error: null,
                });
            } catch (error) {
                if (!active) return;

                setHistoryState({
                    resolvedKey: historyRequestKey,
                    data: null,
                    error: error instanceof Error && error.message ? error.message : "Tarihsel veri yüklenemedi.",
                });
            }
        };

        void loadHistory();

        return () => {
            active = false;
        };
    }, [historyRequestKey, rangeDates.from, rangeDates.to, resolvedCode, resolvedType]);

    useEffect(() => {
        let active = true;

        const loadIndicatorHistory = async () => {
            if (!indicatorHistoryRequestKey || !resolvedCode) {
                setIndicatorHistoryState({
                    resolvedKey: indicatorHistoryRequestKey,
                    data: null,
                    error: null,
                });
                return;
            }

            try {
                const data = await getIndicatorHistory(resolvedCode, rangeDates.from, rangeDates.to);
                if (!active) return;

                setIndicatorHistoryState({
                    resolvedKey: indicatorHistoryRequestKey,
                    data,
                    error: null,
                });
            } catch (error) {
                if (!active) return;

                const message =
                    error instanceof Error && error.message ? error.message : "İndikatör geçmişi yüklenemedi.";
                setIndicatorHistoryState({
                    resolvedKey: indicatorHistoryRequestKey,
                    data: null,
                    error: message,
                });
                emitIndicatorError("İndikatör verileri yüklenemedi, grafik fiyat verisiyle devam ediyor.", error);
            }
        };

        void loadIndicatorHistory();

        return () => {
            active = false;
        };
    }, [indicatorHistoryRequestKey, rangeDates.from, rangeDates.to, resolvedCode]);

    useEffect(() => {
        let active = true;

        const loadLatestIndicator = async () => {
            if (!latestIndicatorRequestKey || !resolvedCode) {
                setLatestIndicatorState({
                    resolvedKey: latestIndicatorRequestKey,
                    data: null,
                    error: null,
                });
                return;
            }

            try {
                const data = await getLatestIndicator(resolvedCode);
                if (!active) return;

                setLatestIndicatorState({
                    resolvedKey: latestIndicatorRequestKey,
                    data,
                    error: null,
                });
            } catch (error) {
                if (!active) return;

                setLatestIndicatorState({
                    resolvedKey: latestIndicatorRequestKey,
                    data: null,
                    error:
                        error instanceof Error && error.message ? error.message : "Güncel indikatör verisi yüklenemedi.",
                });
            }
        };

        void loadLatestIndicator();

        return () => {
            active = false;
        };
    }, [latestIndicatorRequestKey, resolvedCode]);

    const comparisonCodes = useMemo(
        () => (resolvedCode ? [resolvedCode, ...compareExtras] : []),
        [compareExtras, resolvedCode]
    );

    const compareRequestKey =
        comparePanelOpen && comparisonCodes.length > 1
            ? `${resolvedType}:${comparisonCodes.join(",")}:${rangeDates.from}:${rangeDates.to}`
            : "";

    useEffect(() => {
        let active = true;

        const loadComparison = async () => {
            if (!compareRequestKey) {
                setCompareState({
                    resolvedKey: "",
                    data: null,
                    error: null,
                });
                return;
            }

            try {
                const data = await fetchHistoryCompare(resolvedType, comparisonCodes, rangeDates.from, rangeDates.to);
                if (!active) return;

                setCompareState({
                    resolvedKey: compareRequestKey,
                    data,
                    error: null,
                });
            } catch (error) {
                if (!active) return;

                setCompareState({
                    resolvedKey: compareRequestKey,
                    data: null,
                    error: error instanceof Error && error.message ? error.message : "Karşılaştırma verisi yüklenemedi.",
                });
            }
        };

        void loadComparison();

        return () => {
            active = false;
        };
    }, [compareRequestKey, comparisonCodes, rangeDates.from, rangeDates.to, resolvedType]);

    const availableCompareOptions = useMemo(
        () => instrumentOptions.filter((option) => !comparisonCodes.includes(option.code)),
        [comparisonCodes, instrumentOptions]
    );

    useEffect(() => {
        if (!comparePanelOpen) return;
        if (availableCompareOptions.some((option) => option.code === compareDraftCode)) return;
        const draftTimer = window.setTimeout(() => setCompareDraftCode(availableCompareOptions[0]?.code ?? ""), 0);
        return () => window.clearTimeout(draftTimer);
    }, [availableCompareOptions, compareDraftCode, comparePanelOpen]);

    const selectedOption = useMemo(
        () => instrumentOptions.find((option) => option.code === resolvedCode) ?? null,
        [instrumentOptions, resolvedCode]
    );

    const isHistoryLoading = historyRequestKey !== "" && historyState.resolvedKey !== historyRequestKey;
    const historyError = historyRequestKey === historyState.resolvedKey ? historyState.error : null;
    const historyData = historyRequestKey === historyState.resolvedKey ? historyState.data : null;
    const isIndicatorHistoryLoading =
        indicatorHistoryRequestKey !== "" && indicatorHistoryState.resolvedKey !== indicatorHistoryRequestKey;
    const indicatorHistoryError =
        indicatorHistoryRequestKey === indicatorHistoryState.resolvedKey ? indicatorHistoryState.error : null;
    const indicatorHistoryData = useMemo(
        () => (indicatorHistoryRequestKey === indicatorHistoryState.resolvedKey ? indicatorHistoryState.data ?? [] : []),
        [indicatorHistoryRequestKey, indicatorHistoryState.data, indicatorHistoryState.resolvedKey]
    );
    const latestIndicator =
        latestIndicatorRequestKey === latestIndicatorState.resolvedKey ? latestIndicatorState.data : null;
    const enrichedHistory = useMemo(
        () => buildEnrichedHistory(historyData?.data ?? [], indicatorHistoryData),
        [historyData, indicatorHistoryData]
    );

    const latestPoint = enrichedHistory.at(-1) ?? null;
    const periodChange = useMemo(() => calculatePeriodChange(enrichedHistory), [enrichedHistory]);

    const dates = useMemo(() => enrichedHistory.map((point) => point.date), [enrichedHistory]);
    const candlestickData = useMemo<CandlestickPoint[]>(
        () =>
            enrichedHistory.map((point) => ({
                date: point.date,
                open: point.open,
                high: point.high,
                low: point.low,
                close: point.close,
                volume: point.volume,
            })),
        [enrichedHistory]
    );

    const priceSeries = useMemo(() => {
        const series: ChartSeries[] = [
            {
                key: "close",
                label: "Fiyat",
                color: CHART_COLORS.price,
                values: enrichedHistory.map((point) => point.close),
                strokeWidth: 2.8,
            },
        ];

        if (activeOverlayIndicators.includes("sma20")) {
            series.push({
                key: "sma20",
                label: "SMA 20",
                color: INDICATOR_COLORS.sma20,
                values: enrichedHistory.map((point) => point.sma20),
                strokeWidth: 2.2,
            });
        }

        if (activeOverlayIndicators.includes("sma50")) {
            series.push({
                key: "sma50",
                label: "SMA 50",
                color: INDICATOR_COLORS.sma50,
                values: enrichedHistory.map((point) => point.sma50),
                strokeWidth: 2.2,
            });
        }

        if (activeOverlayIndicators.includes("sma200")) {
            series.push({
                key: "sma200",
                label: "SMA 200",
                color: INDICATOR_COLORS.sma200,
                values: enrichedHistory.map((point) => point.sma200),
                strokeWidth: 2,
            });
        }

        if (activeOverlayIndicators.includes("ema12")) {
            series.push({
                key: "ema12",
                label: "EMA 12",
                color: INDICATOR_COLORS.ema12,
                values: enrichedHistory.map((point) => point.ema12),
                strokeWidth: 2,
            });
        }

        if (activeOverlayIndicators.includes("ema26")) {
            series.push({
                key: "ema26",
                label: "EMA 26",
                color: INDICATOR_COLORS.ema26,
                values: enrichedHistory.map((point) => point.ema26),
                strokeWidth: 2,
            });
        }

        if (activeOverlayIndicators.includes("bollinger")) {
            series.push(
                {
                    key: "bollingerUpper",
                    label: "Bollinger Üst",
                    color: INDICATOR_COLORS.bollingerUpper,
                    values: enrichedHistory.map((point) => point.bollingerUpper),
                    strokeWidth: 1.8,
                    dashArray: "6 4",
                },
                {
                    key: "bollingerMiddle",
                    label: "Bollinger Orta",
                    color: INDICATOR_COLORS.bollingerMiddle,
                    values: enrichedHistory.map((point) => point.bollingerMiddle),
                    strokeWidth: 2,
                },
                {
                    key: "bollingerLower",
                    label: "Bollinger Alt",
                    color: INDICATOR_COLORS.bollingerLower,
                    values: enrichedHistory.map((point) => point.bollingerLower),
                    strokeWidth: 1.8,
                    dashArray: "6 4",
                }
            );
        }

        if (activeOverlayIndicators.includes("ichimoku")) {
            series.push(
                {
                    key: "ichimokuTenkan",
                    label: "Tenkan",
                    color: INDICATOR_COLORS.ichimokuTenkan,
                    values: enrichedHistory.map((point) => point.ichimokuTenkan),
                    strokeWidth: 1.9,
                },
                {
                    key: "ichimokuKijun",
                    label: "Kijun",
                    color: INDICATOR_COLORS.ichimokuKijun,
                    values: enrichedHistory.map((point) => point.ichimokuKijun),
                    strokeWidth: 1.9,
                }
            );
        }

        return series;
    }, [activeOverlayIndicators, enrichedHistory]);

    const metricCards = useMemo(
        () => [
            {
                label: resolvedType === "stocks" ? "Son Kapanış" : "Son Değer",
                value: formatValueByType(resolvedType, latestPoint?.close ?? null),
            },
            {
                label: "Açılış",
                value: formatValueByType(resolvedType, latestPoint?.open ?? null),
            },
            {
                label: "Yüksek",
                value: formatValueByType(resolvedType, latestPoint?.high ?? null),
            },
            {
                label: "Düşük",
                value: formatValueByType(resolvedType, latestPoint?.low ?? null),
            },
            {
                label: "Hacim",
                value: formatCompactNumber(latestPoint?.volume ?? null),
            },
        ],
        [latestPoint, resolvedType]
    );
    const indicatorSnapshot = latestIndicator ?? indicatorHistoryData.at(-1) ?? null;
    const latestHistoryIndicator = indicatorHistoryData.at(-1) ?? null;
    const previousHistoryIndicator = indicatorHistoryData.at(-2) ?? null;
    const indicatorSnapshotCards = useMemo(
        () =>
            resolvedType === "stocks"
                ? [
                      {
                          label: "RSI",
                          value: formatIndicatorSnapshotValue(indicatorSnapshot?.rsi14, 1),
                          note: getRsiComment(indicatorSnapshot?.rsi14),
                          context: getRsiContext(indicatorSnapshot?.rsi14),
                      },
                      {
                          label: "MACD",
                          value: formatIndicatorSnapshotValue(latestHistoryIndicator?.macdHistogram, 2),
                          note: getMomentumComment(indicatorSnapshot?.macdHistogram),
                          context: getMacdContext(
                              latestHistoryIndicator?.macdHistogram,
                              previousHistoryIndicator?.macdHistogram
                          ),
                      },
                      {
                          label: "Stochastic",
                          value: formatIndicatorSnapshotValue(indicatorSnapshot?.stochasticK, 1),
                          note: getStochasticComment(indicatorSnapshot?.stochasticK),
                          context: getStochasticContext(indicatorSnapshot?.stochasticK, indicatorSnapshot?.stochasticD),
                      },
                  ]
                : [],
        [indicatorSnapshot, latestHistoryIndicator, previousHistoryIndicator, resolvedType]
    );

    const comparisonLoading = compareRequestKey !== "" && compareState.resolvedKey !== compareRequestKey;
    const comparisonError = compareRequestKey === compareState.resolvedKey ? compareState.error : null;
    const comparisonData = compareRequestKey === compareState.resolvedKey ? compareState.data : null;
    const comparisonChart = useMemo(
        () => buildComparisonChartData(comparisonCodes, comparisonData, instrumentOptions),
        [comparisonCodes, comparisonData, instrumentOptions]
    );

    const chartSeries = priceSeries;
    const candlestickOverlays = useMemo<CandlestickOverlay[]>(() => {
        const overlays: CandlestickOverlay[] = [];
        const shiftedSenkouA = enrichedHistory.map((point) => ({
            date: addBusinessDays(point.date, 26),
            value: point.ichimokuSenkouA,
        }));
        const shiftedSenkouB = enrichedHistory.map((point) => ({
            date: addBusinessDays(point.date, 26),
            value: point.ichimokuSenkouB,
        }));

        if (activeOverlayIndicators.includes("sma20")) {
            overlays.push({
                key: "sma20",
                label: "SMA 20",
                color: INDICATOR_COLORS.sma20,
                values: enrichedHistory.map((point) => point.sma20),
                lineWidth: 2.2,
            });
        }

        if (activeOverlayIndicators.includes("sma50")) {
            overlays.push({
                key: "sma50",
                label: "SMA 50",
                color: INDICATOR_COLORS.sma50,
                values: enrichedHistory.map((point) => point.sma50),
                lineWidth: 2.2,
            });
        }

        if (activeOverlayIndicators.includes("sma200")) {
            overlays.push({
                key: "sma200",
                label: "SMA 200",
                color: INDICATOR_COLORS.sma200,
                values: enrichedHistory.map((point) => point.sma200),
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
            });
        }

        if (activeOverlayIndicators.includes("ema12")) {
            overlays.push({
                key: "ema12",
                label: "EMA 12",
                color: INDICATOR_COLORS.ema12,
                values: enrichedHistory.map((point) => point.ema12),
                lineWidth: 2,
            });
        }

        if (activeOverlayIndicators.includes("ema26")) {
            overlays.push({
                key: "ema26",
                label: "EMA 26",
                color: INDICATOR_COLORS.ema26,
                values: enrichedHistory.map((point) => point.ema26),
                lineWidth: 2,
            });
        }

        if (activeOverlayIndicators.includes("bollinger")) {
            overlays.push(
                {
                    key: "bollingerUpper",
                    label: "Bollinger Üst",
                    color: INDICATOR_COLORS.bollingerUpper,
                    values: enrichedHistory.map((point) => point.bollingerUpper),
                    lineWidth: 1.7,
                    lineStyle: LineStyle.Dashed,
                },
                {
                    key: "bollingerMiddle",
                    label: "Bollinger Orta",
                    color: INDICATOR_COLORS.bollingerMiddle,
                    values: enrichedHistory.map((point) => point.bollingerMiddle),
                    lineWidth: 1.9,
                },
                {
                    key: "bollingerLower",
                    label: "Bollinger Alt",
                    color: INDICATOR_COLORS.bollingerLower,
                    values: enrichedHistory.map((point) => point.bollingerLower),
                    lineWidth: 1.7,
                    lineStyle: LineStyle.Dashed,
                }
            );
        }

        if (activeOverlayIndicators.includes("ichimoku")) {
            overlays.push(
                {
                    key: "ichimokuTenkan",
                    label: "Tenkan",
                    color: INDICATOR_COLORS.ichimokuTenkan,
                    values: enrichedHistory.map((point) => point.ichimokuTenkan),
                    lineWidth: 1.8,
                },
                {
                    key: "ichimokuKijun",
                    label: "Kijun",
                    color: INDICATOR_COLORS.ichimokuKijun,
                    values: enrichedHistory.map((point) => point.ichimokuKijun),
                    lineWidth: 1.8,
                },
                {
                    key: "ichimokuSenkouA",
                    label: "Senkou A",
                    color: INDICATOR_COLORS.ichimokuSenkouA,
                    points: shiftedSenkouA,
                    lineWidth: 1.6,
                },
                {
                    key: "ichimokuSenkouB",
                    label: "Senkou B",
                    color: INDICATOR_COLORS.ichimokuSenkouB,
                    points: shiftedSenkouB,
                    lineWidth: 1.6,
                }
            );
        }

        return overlays;
    }, [activeOverlayIndicators, enrichedHistory]);
    const candlestickClouds = useMemo<CandlestickCloud[]>(
        () =>
            activeOverlayIndicators.includes("ichimoku")
                ? [
                      {
                          key: "ichimoku-cloud",
                          upper: enrichedHistory.map((point) => ({
                              date: addBusinessDays(point.date, 26),
                              value: point.ichimokuSenkouA,
                          })),
                          lower: enrichedHistory.map((point) => ({
                              date: addBusinessDays(point.date, 26),
                              value: point.ichimokuSenkouB,
                          })),
                          bullishColor: "rgba(91, 184, 112, 0.16)",
                          bearishColor: "rgba(224, 88, 88, 0.14)",
                      },
                  ]
                : [],
        [activeOverlayIndicators, enrichedHistory]
    );
    const candlestickTooltipIndicators = useMemo(
        () => [
            ...candlestickOverlays
                .filter((item): item is CandlestickOverlay & { values: Array<number | null> } => Boolean(item.values))
                .map((item) => ({
                    key: item.key,
                    label: item.label,
                    color: item.color,
                    values: item.values,
                    formatter: (value: number) => formatValueByType(resolvedType, value),
                })),
        ],
        [candlestickOverlays, resolvedType]
    );
    const supportsCandlestick = resolvedType === "stocks";
    const effectiveChartType = supportsCandlestick ? chartType : "line";
    const chartLegendSeries = useMemo(
        () => [
            {
                key: "price",
                label: "Fiyat",
                color: CHART_COLORS.price,
            },
            ...OVERLAY_INDICATOR_OPTIONS.filter((option) => activeOverlayIndicators.includes(option.key)).map((option) => ({
                key: option.key,
                label: option.label,
                color: option.color,
            })),
        ],
        [activeOverlayIndicators]
    );
    const drawingBusy = drawingsLoading || drawingsMutating;
    const drawingToolsDisabled = !supportsCandlestick || !resolvedCode || isHistoryLoading || enrichedHistory.length === 0;

    useEffect(() => {
        if (effectiveChartType !== "candle") {
            const resetTimer = window.setTimeout(() => {
                setDrawingDraft(null);
                setDrawingTool("select");
            }, 0);

            return () => window.clearTimeout(resetTimer);
        }

        return undefined;
    }, [effectiveChartType]);

    const createDrawingRequest = (
        drawingType: DrawingType,
        drawingData: Record<string, unknown>
    ): CreateDrawingRequest => {
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
                // Toast is emitted by useDrawings.
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
            // Toast is emitted by useDrawings.
        }
    };

    const handleClearDrawings = async () => {
        if (drawingBusy || drawings.length === 0) return;
        if (!window.confirm("Tüm çizimleri silmek istediğinize emin misiniz?")) return;

        setDrawingDraft(null);
        try {
            await clearAllInstrumentDrawings();
            setDrawingTool("select");
        } catch {
            // Toast is emitted by useDrawings.
        }
    };

    const toggleOverlayIndicator = (key: OverlayIndicatorKey) => {
        setActiveOverlayIndicators((current) => {
            if (current.includes(key)) {
                return current.filter((item) => item !== key);
            }

            return [...current, key];
        });
    };

    const chartEmptyLabel = "Seçili aralıkta gösterilecek fiyat verisi bulunamadı.";
    const chartReferences: ReferenceLine[] = [];
    const chartDomain = undefined;

    const latestDate = latestPoint?.date ?? historyData?.to ?? null;
    const selectedTypeMeta = TYPE_META[resolvedType];

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

    return (
        <KapitalShell activePage="analysis" showCategories={false}>
            <div className="analysis-page">
                <div className="analysis-layout">
                    <section className="analysis-hero">
                        <div className="analysis-hero-copy">
                            <div className="analysis-kicker">Tarihsel Veri ve Teknik Analiz</div>
                            <div className="analysis-title-row">
                                <div className="analysis-title-copy">
                                    <h1 className="analysis-title">{resolvedCode || "Analiz"}</h1>
                                    <p className="analysis-subtitle">
                                        {selectedOption?.name ?? "Enstrüman seçin"}{" "}
                                        <span>{selectedOption?.detail ? `· ${selectedOption.detail}` : ""}</span>
                                    </p>
                                </div>

                                <div
                                    className={`analysis-change-chip ${
                                        (periodChange ?? 0) > 0 ? "up" : (periodChange ?? 0) < 0 ? "down" : "flat"
                                    }`.trim()}
                                >
                                    <strong>{formatPercent(periodChange)}</strong>
                                    <span>Seçili aralık değişimi</span>
                                </div>
                            </div>

                            <p className="analysis-copy">
                                {selectedTypeMeta.description} {rangeDates.from} ile {rangeDates.to} arasındaki veriler
                                teknik indikatörler ve fiyat serisiyle birlikte izlenir.
                            </p>

                            <div className="analysis-type-list" role="tablist" aria-label="Enstrüman türü">
                                {TYPE_ORDER.map((type) => {
                                    const hasOptions = catalogState.data[type].length > 0;
                                    return (
                                        <button
                                            key={type}
                                            className={`analysis-type-pill ${resolvedType === type ? "active" : ""}`.trim()}
                                            type="button"
                                            disabled={!hasOptions}
                                            onClick={() => {
                                                updateSearchParam((params) => {
                                                    params.set("type", type);
                                                    params.delete("compare");
                                                    const nextCode = catalogState.data[type][0]?.code;
                                                    if (nextCode) {
                                                        params.set("code", nextCode);
                                                    } else {
                                                        params.delete("code");
                                                    }
                                                });
                                            }}
                                        >
                                            <span>{TYPE_META[type].label}</span>
                                            <small>{catalogState.data[type].length}</small>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="analysis-hero-side">
                            <div className="analysis-control-card">
                                <div className="analysis-panel-kicker">Enstrüman Seçimi</div>
                                <h2 className="analysis-panel-title">Kod ve zaman aralığı</h2>
                                <div className="analysis-field-grid">
                                    <label className="analysis-field">
                                        <span>Kod</span>
                                        <select
                                            value={resolvedCode}
                                            onChange={(event) => {
                                                const nextCode = event.target.value;
                                                updateSearchParam((params) => {
                                                    params.set("code", nextCode);
                                                    const nextCompare = sanitizeCompareCodes(
                                                        params.get("compare"),
                                                        instrumentOptions,
                                                        nextCode
                                                    );
                                                    if (nextCompare.length > 0) {
                                                        params.set("compare", nextCompare.join(","));
                                                    } else {
                                                        params.delete("compare");
                                                    }
                                                });
                                            }}
                                        >
                                            {instrumentOptions.map((option) => (
                                                <option key={option.code} value={option.code}>
                                                    {option.code} · {option.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="analysis-range-list" aria-label="Zaman aralığı seçimi">
                                    {RANGE_OPTIONS.map((option) => (
                                        <button
                                            key={option.key}
                                            className={`analysis-range-pill ${selectedRange === option.key ? "active" : ""}`.trim()}
                                            type="button"
                                            onClick={() => {
                                                updateSearchParam((params) => {
                                                    params.set("range", option.key);
                                                });
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="analysis-meta-list">
                                    <div>
                                        <span>Tür</span>
                                        <strong>{selectedTypeMeta.label}</strong>
                                    </div>
                                    <div>
                                        <span>Son veri</span>
                                        <strong>{formatDateLabel(latestDate)}</strong>
                                    </div>
                                    <div>
                                        <span>Veri Noktası</span>
                                        <strong>{enrichedHistory.length}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {catalogState.error ? (
                        <section className="analysis-status-card warning">
                            <div>
                                <strong>Enstrüman listesi notu</strong>
                                <span>{catalogState.error}</span>
                            </div>
                        </section>
                    ) : null}

                    <section className="analysis-metrics">
                        {metricCards.map((card) => (
                            <article key={card.label} className="analysis-metric-card">
                                <div className="analysis-metric-label">{card.label}</div>
                                <div className="analysis-metric-value">{isHistoryLoading ? "..." : card.value}</div>
                                <div className="analysis-metric-note">{formatDateLabel(latestDate)}</div>
                            </article>
                        ))}
                    </section>

                    {indicatorSnapshotCards.length > 0 ? (
                        <section className="analysis-indicator-snapshot">
                            {indicatorSnapshotCards.map((card) => (
                                <article key={card.label} className="analysis-indicator-snapshot-card">
                                    <span>{card.label}</span>
                                    <strong>{card.value}</strong>
                                    <em>{card.note}</em>
                                    <small>{card.context}</small>
                                </article>
                            ))}
                        </section>
                    ) : null}

                    <section
                        ref={chartPanelRef}
                        className={`analysis-panel analysis-chart-panel ${isChartFullscreen ? "fullscreen" : ""}`.trim()}
                    >
                        <div className="analysis-panel-head">
                            <div>
                                <div className="analysis-panel-kicker">ANA GRAFİK</div>
                                <h2 className="analysis-panel-title">{selectedOption?.name ?? "Tarihsel seri"}</h2>
                                <p className="analysis-panel-subtitle">
                                    Seçili aralıkta fiyat, hacim ve indikatör serileri birlikte gösterilir.
                                </p>
                            </div>

                            <div className="analysis-panel-actions">
                                <button
                                    className="analysis-fullscreen-btn"
                                    type="button"
                                    onClick={() => void toggleChartFullscreen()}
                                    aria-label={isChartFullscreen ? "Tam ekrandan çık" : "Grafiği tam ekran aç"}
                                    title={isChartFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
                                >
                                    {isChartFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                                    <span>{isChartFullscreen ? "Küçült" : "Tam ekran"}</span>
                                </button>
                                <button
                                    className={`analysis-compare-toggle ${comparePanelOpen ? "active" : ""}`.trim()}
                                    type="button"
                                    onClick={() => setComparePanelOpen((value) => !value)}
                                >
                                    {comparePanelOpen ? "Paneli Gizle" : "+ Karşılaştır"}
                                </button>
                            </div>
                        </div>

                        <div className="analysis-chart-control-stack">
                            <div className="analysis-chart-toolbar">
                                {supportsCandlestick ? (
                                    <div className="analysis-chart-type-switch" role="radiogroup" aria-label="Grafik türü">
                                        <button
                                            className={`analysis-toggle-chip ${chartType === "line" ? "active" : ""}`.trim()}
                                            type="button"
                                            role="radio"
                                            aria-checked={chartType === "line"}
                                            onClick={() => setChartType("line")}
                                        >
                                            Çizgi
                                        </button>
                                        <button
                                            className={`analysis-toggle-chip ${chartType === "candle" ? "active" : ""}`.trim()}
                                            type="button"
                                            role="radio"
                                            aria-checked={chartType === "candle"}
                                            onClick={() => setChartType("candle")}
                                        >
                                            Mum
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            {resolvedType === "stocks" ? (
                                <div className="analysis-indicator-panel">
                                    <div className="analysis-indicator-group">
                                        <div>
                                            <span className="analysis-panel-kicker">OVERLAY İNDİKATÖRLER</span>
                                        </div>
                                        <div className="analysis-toggle-list">
                                            {OVERLAY_INDICATOR_OPTIONS.map((option) => (
                                                <button
                                                    key={option.key}
                                                    className={`analysis-toggle-chip ${
                                                        activeOverlayIndicators.includes(option.key) ? "active" : ""
                                                    }`.trim()}
                                                    type="button"
                                                    aria-pressed={activeOverlayIndicators.includes(option.key)}
                                                    onClick={() => toggleOverlayIndicator(option.key)}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {isIndicatorHistoryLoading ? (
                                <div className="analysis-status-card compact">
                                    <div>
                                        <strong>İndikatörler yükleniyor</strong>
                                        <span>Seçili sembol ve aralık için teknik seriler alınıyor.</span>
                                    </div>
                                </div>
                            ) : indicatorHistoryError ? (
                                <div className="analysis-status-card warning compact">
                                    <div>
                                        <strong>İndikatör verisi alınamadı</strong>
                                        <span>{indicatorHistoryError}</span>
                                    </div>
                                </div>
                            ) : null}

                            <div className="analysis-series-legend">
                                {chartLegendSeries.map((item) => (
                                    <div key={item.key} className="analysis-legend-item">
                                        <span className="analysis-legend-dot" style={{ backgroundColor: item.color }} />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isHistoryLoading ? (
                            <div className="analysis-status-card">
                                <div>
                                    <strong>Grafik yükleniyor</strong>
                                    <span>Tarihsel veri alınıyor.</span>
                                </div>
                            </div>
                        ) : historyError ? (
                            <div className="analysis-status-card error">
                                <div>
                                    <strong>Veri alınamadı</strong>
                                    <span>{historyError}</span>
                                </div>
                            </div>
                        ) : enrichedHistory.length === 0 ? (
                            <div className="analysis-empty-card">
                                <strong>Seçili aralıkta veri yok</strong>
                                <span>Farklı bir zaman aralığı veya enstrüman deneyin.</span>
                            </div>
                        ) : effectiveChartType === "candle" ? (
                            <div className="analysis-chart-stage">
                                {supportsCandlestick ? (
                                    <DrawingToolbar
                                        activeTool={drawingTool}
                                        toolDisabled={drawingToolsDisabled}
                                        busy={drawingBusy}
                                        canClear={drawings.length > 0}
                                        onSelect={handleDrawingToolSelect}
                                        onClear={handleClearDrawings}
                                    />
                                ) : null}
                                <CandlestickChart
                                    key={`candle-${resolvedType}-${resolvedCode}-${selectedRange}-${activeOverlayIndicators.join(",")}`}
                                    data={candlestickData}
                                    overlays={candlestickOverlays}
                                    clouds={candlestickClouds}
                                    tooltipIndicators={candlestickTooltipIndicators}
                                    drawings={drawings}
                                    drawingMode={drawingTool}
                                    drawingDraft={drawingDraft}
                                    onDrawingPoint={handleDrawingPoint}
                                    emptyLabel={chartEmptyLabel}
                                    valueFormatter={(value) => formatValueByType(resolvedType, value)}
                                    volumeFormatter={formatCompactNumber}
                                />
                            </div>
                        ) : (
                            <div className="analysis-chart-stage">
                                <LineChart
                                    dates={dates}
                                    series={chartSeries}
                                    emptyLabel={chartEmptyLabel}
                                    yFormatter={(value) => formatValueByType(resolvedType, value)}
                                    fixedDomain={chartDomain}
                                    referenceLines={chartReferences}
                                    tooltipData={enrichedHistory}
                                    valueFormatter={(value) => formatValueByType(resolvedType, value)}
                                    volumeFormatter={formatCompactNumber}
                                />
                            </div>
                        )}

                        {comparePanelOpen ? (
                            <div className="analysis-compare-panel">
                                <div className="analysis-compare-head">
                                    <div>
                                        <div className="analysis-panel-kicker">Karşılaştırma Paneli</div>
                                        <h3 className="analysis-compare-title">Normalize % bazlı grafik</h3>
                                    </div>
                                    <p className="analysis-compare-note">
                                        Ana seri dahil en fazla 3 enstrüman kullanılır.
                                    </p>
                                </div>

                                <div className="analysis-compare-controls">
                                    <div className="analysis-chip-row">
                                        {comparisonCodes.map((code, index) => {
                                            const option = instrumentOptions.find((item) => item.code === code);
                                            const isPrimary = index === 0;

                                            return (
                                                <div key={code} className={`analysis-compare-chip ${isPrimary ? "primary" : ""}`.trim()}>
                                                    <span>{code}</span>
                                                    <small>{option?.name ?? code}</small>
                                                    {isPrimary ? (
                                                        <strong>Ana seri</strong>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                updateSearchParam((params) => {
                                                                    const nextCompare = compareExtras.filter((item) => item !== code);
                                                                    if (nextCompare.length > 0) {
                                                                        params.set("compare", nextCompare.join(","));
                                                                    } else {
                                                                        params.delete("compare");
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            Kaldır
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="analysis-compare-actions">
                                        <label className="analysis-field">
                                            <span>Yeni enstrüman</span>
                                            <select
                                                value={compareDraftCode}
                                                onChange={(event) => setCompareDraftCode(event.target.value)}
                                                disabled={comparisonCodes.length >= 3 || availableCompareOptions.length === 0}
                                            >
                                                {availableCompareOptions.length === 0 ? (
                                                    <option value="">Eklenebilir enstrüman yok</option>
                                                ) : (
                                                    availableCompareOptions.map((option) => (
                                                        <option key={option.code} value={option.code}>
                                                            {option.code} · {option.name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </label>

                                        <button
                                            className="analysis-add-btn"
                                            type="button"
                                            disabled={
                                                comparisonCodes.length >= 3 ||
                                                compareDraftCode.length === 0 ||
                                                !availableCompareOptions.some((option) => option.code === compareDraftCode)
                                            }
                                            onClick={() => {
                                                updateSearchParam((params) => {
                                                    const nextCompare = [...compareExtras, compareDraftCode].slice(0, 2);
                                                    if (nextCompare.length > 0) {
                                                        params.set("compare", nextCompare.join(","));
                                                    }
                                                });
                                            }}
                                        >
                                            Ekle
                                        </button>
                                    </div>
                                </div>

                                {comparisonCodes.length <= 1 ? (
                                    <div className="analysis-empty-card compact">
                                        <strong>Karşılaştırma hazır</strong>
                                        <span>Grafik için aynı türden en az bir enstrüman daha ekleyin.</span>
                                    </div>
                                ) : comparisonLoading ? (
                                    <div className="analysis-status-card">
                                        <div>
                                            <strong>Karşılaştırma yükleniyor</strong>
                                            <span>Seçili enstrümanlar için normalize seri hazırlanıyor.</span>
                                        </div>
                                    </div>
                                ) : comparisonError ? (
                                    <div className="analysis-status-card error">
                                        <div>
                                            <strong>Karşılaştırma verisi alınamadı</strong>
                                            <span>{comparisonError}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="analysis-series-legend compare">
                                            {comparisonChart.series.map((item) => (
                                                <div key={item.key} className="analysis-legend-item">
                                                    <span className="analysis-legend-dot" style={{ backgroundColor: item.color }} />
                                                    <span>{item.key}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <LineChart
                                            dates={comparisonChart.dates}
                                            series={comparisonChart.series}
                                            emptyLabel="Karşılaştırma serileri hazır değil."
                                            yFormatter={(value) => `${value > 0 ? "+" : ""}${formatDecimal(value, 2)}%`}
                                            referenceLines={[{ value: 0, label: "0%", color: "rgba(17,17,17,0.28)" }]}
                                        />
                                    </>
                                )}
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        </KapitalShell>
    );
}
