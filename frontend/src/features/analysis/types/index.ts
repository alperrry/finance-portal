import type { HistoryPoint } from "../api/historyApi";
import type { CandlestickDrawingMode } from "../../../components/charts/CandlestickChart";
import type { InstrumentType } from "../api/historyApi";

export type RangeKey = "1A" | "3A" | "6A" | "1Y";
export type ChartType = "line" | "candle";
export type DrawingTool = CandlestickDrawingMode;
export type OverlayIndicatorKey =
    | "sma20"
    | "sma50"
    | "sma200"
    | "ema12"
    | "ema26"
    | "bollinger"
    | "ichimoku";

export type InstrumentOption = {
    code: string;
    name: string;
    detail: string;
};

export type InstrumentCatalog = Record<InstrumentType, InstrumentOption[]>;

export type RequestState<T> = {
    resolvedKey: string;
    data: T | null;
    error: string | null;
};

export type EnrichedHistoryPoint = HistoryPoint & {
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

export type CatalogState = {
    data: InstrumentCatalog;
    loading: boolean;
    error: string | null;
};

export const TYPE_ORDER: InstrumentType[] = ["stocks", "indexes", "commodities", "crypto", "fx", "funds", "bonds"];

export const TYPE_I18N_KEY: Record<InstrumentType, string> = {
    stocks: "stocks",
    indexes: "indices",
    commodities: "commodity",
    crypto: "crypto",
    fx: "fx",
    funds: "funds",
    bonds: "bond",
};

export const RANGE_OPTIONS: Array<{ key: RangeKey; months?: number; days?: number }> = [
    { key: "1A", months: 1 },
    { key: "3A", months: 3 },
    { key: "6A", months: 6 },
    { key: "1Y", days: 365 },
];

export const ANALYSIS_RANGE_I18N_KEY: Record<RangeKey, string> = {
    "1A": "oneMonth",
    "3A": "threeMonths",
    "6A": "sixMonths",
    "1Y": "oneYear",
};

export const CHART_COLORS = {
    price: "#111111",
    accent: "#c1622f",
    accentSoft: "#d98b63",
    success: "#5bb870",
    danger: "#e05858",
    muted: "#76808b",
    compare: ["#111111", "#c1622f", "#5bb870"],
};

export const INDICATOR_COLORS = {
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

export const OVERLAY_INDICATOR_OPTIONS: Array<{ key: OverlayIndicatorKey; label: string; color: string }> = [
    { key: "sma20", label: "SMA 20", color: INDICATOR_COLORS.sma20 },
    { key: "sma50", label: "SMA 50", color: INDICATOR_COLORS.sma50 },
    { key: "sma200", label: "SMA 200", color: INDICATOR_COLORS.sma200 },
    { key: "ema12", label: "EMA 12", color: INDICATOR_COLORS.ema12 },
    { key: "ema26", label: "EMA 26", color: INDICATOR_COLORS.ema26 },
    { key: "bollinger", label: "Bollinger", color: INDICATOR_COLORS.bollingerMiddle },
    { key: "ichimoku", label: "Ichimoku", color: INDICATOR_COLORS.ichimokuTenkan },
];

export const DEFAULT_DRAWING_STYLE: Record<string, { color: string; lineWidth: number }> = {
    TREND_LINE: { color: "#FF6B35", lineWidth: 2 },
    HORIZONTAL_LINE: { color: "#3498db", lineWidth: 2 },
    RECTANGLE: { color: "#2ECC71", lineWidth: 2 },
};

export const DEFAULT_RANGE: RangeKey = "6A";
