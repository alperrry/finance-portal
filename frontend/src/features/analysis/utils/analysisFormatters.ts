import type { CompareResponse, HistoryPoint, InstrumentType } from "../api/historyApi";
import type { BondResponse, FundResponse, FxResponse, StockResponse } from "../../market/api/marketApi";
import type { StockIndicator } from "../../../types/indicator";
import type { ChartSeries } from "../components/LightweightLineChart";
import { CHART_COLORS } from "../types";
import type { EnrichedHistoryPoint, InstrumentOption, RangeKey } from "../types";
import { RANGE_OPTIONS } from "../types";
import { ApiError } from "../../../services/api/client";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

export const toSafeNumber = (value: number | null | undefined): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

export const formatDecimal = (value: number | null | undefined, digits = 2): string => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";
    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
};

export const formatPercent = (value: number | null | undefined, digits = 2): string => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatDecimal(normalized, digits)}%`;
};

export const formatCompactNumber = (value: number | null | undefined): string => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";
    const absolute = Math.abs(normalized);
    if (absolute >= 1_000_000_000) return `${formatDecimal(normalized / 1_000_000_000, 1)} Mr`;
    if (absolute >= 1_000_000) return `${formatDecimal(normalized / 1_000_000, 1)} Mn`;
    if (absolute >= 1_000) return `${formatDecimal(normalized / 1_000, 1)} Bin`;
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(normalized);
};

export const formatDateLabel = (value: string | null | undefined): string => {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "-";
    return dateFormatter.format(date);
};

export const getValueDigits = (type: InstrumentType, value: number | null | undefined): number => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return type === "funds" ? 4 : 2;
    if (type === "fx") return Math.abs(normalized) >= 10 ? 4 : 5;
    if (type === "funds") return 4;
    return 2;
};

export const formatValueByType = (type: InstrumentType, value: number | null | undefined): string =>
    formatDecimal(value, getValueDigits(type, value));

export const parseType = (value: string | null): InstrumentType | null =>
    value === "stocks" || value === "indexes" || value === "commodities" || value === "crypto" ||
    value === "fx" || value === "funds" || value === "bonds" ? value : null;

export const parseRange = (value: string | null): RangeKey =>
    value === "1A" || value === "3A" || value === "6A" || value === "1Y" ? value : "6A";

export const toDrawingInstrumentType = (type: InstrumentType): "STOCK" | "CURRENCY" | "FUND" | "BOND" => {
    if (type === "fx") return "CURRENCY";
    if (type === "funds") return "FUND";
    if (type === "bonds") return "BOND";
    return "STOCK";
};

export const subtractMonths = (date: Date, months: number): Date => {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() - months);
    const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, maxDay));
    return result;
};

export const subtractDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
};

export const toIsoDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const addBusinessDays = (isoDate: string, days: number): string => {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) added += 1;
    }
    return toIsoDate(date);
};

export const getRangeDates = (range: RangeKey, today: Date): { from: string; to: string } => {
    const config = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[2];
    const to = new Date(today);
    const from = config.months ? subtractMonths(to, config.months) : subtractDays(to, config.days ?? 365);
    return { from: toIsoDate(from), to: toIsoDate(to) };
};

export const createEmptyCatalog = () => ({
    stocks: [] as InstrumentOption[],
    indexes: [] as InstrumentOption[],
    commodities: [] as InstrumentOption[],
    crypto: [] as InstrumentOption[],
    fx: [] as InstrumentOption[],
    funds: [] as InstrumentOption[],
    bonds: [] as InstrumentOption[],
});

export const buildCatalogFromStocks = (rows: StockResponse[]): InstrumentOption[] =>
    [...rows]
        .map((row) => ({ code: row.symbol, name: row.longName ?? row.shortName ?? row.symbol, detail: row.sector ?? row.indexName ?? "Hisse" }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

export const buildCatalogFromFx = (rows: FxResponse[]): InstrumentOption[] =>
    [...rows]
        .map((row) => ({ code: row.currencyCode, name: row.currencyName, detail: `TCMB · ${row.unit > 1 ? `${row.unit} birim` : "1 birim"}` }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

export const buildCatalogFromFunds = (rows: FundResponse[]): InstrumentOption[] =>
    [...rows]
        .map((row) => ({ code: row.code, name: row.name, detail: row.fundType ?? "Fon" }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

export const buildCatalogFromBonds = (rows: BondResponse[]): InstrumentOption[] =>
    [...rows]
        .map((row) => ({ code: row.evdsSeriesCode, name: row.name, detail: row.currency ?? row.bondType ?? "Tahvil/Bono" }))
        .sort((left, right) => left.code.localeCompare(right.code, "tr"));

export const sanitizeCompareCodes = (value: string | null, options: InstrumentOption[], currentCode: string): string[] => {
    if (!value) return [];
    const available = new Set(options.map((option) => option.code));
    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index)
        .filter((item) => item !== currentCode && available.has(item))
        .slice(0, 2);
};

export const findFirstAvailableType = (catalog: ReturnType<typeof createEmptyCatalog>): InstrumentType => {
    const order: InstrumentType[] = ["stocks", "indexes", "commodities", "crypto", "fx", "funds", "bonds"];
    return order.find((type) => catalog[type].length > 0) ?? "stocks";
};

const computeSma = (values: Array<number | null>, period: number): Array<number | null> =>
    values.map((_, index) => {
        if (index + 1 < period) return null;
        const window = values.slice(index - period + 1, index + 1);
        const safeWindow = window.filter((value): value is number => value !== null);
        if (safeWindow.length !== period) return null;
        return safeWindow.reduce((sum, value) => sum + value, 0) / period;
    });

const computeRollingStdDev = (values: Array<number | null>, period: number, means: Array<number | null>): Array<number | null> =>
    values.map((_, index) => {
        const mean = means[index];
        if (index + 1 < period || mean === null) return null;
        const window = values.slice(index - period + 1, index + 1);
        const safeWindow = window.filter((value): value is number => value !== null);
        if (safeWindow.length !== period) return null;
        const variance = safeWindow.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
        return Math.sqrt(variance);
    });

const computeRsi = (values: Array<number | null>, period: number): Array<number | null> =>
    values.map((value, index) => {
        if (value === null || index === 0 || index < period) return null;
        let gainTotal = 0;
        let lossTotal = 0;
        for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
            const current = values[cursor];
            const previous = values[cursor - 1];
            if (current === null || previous === null) return null;
            const delta = current - previous;
            if (delta > 0) gainTotal += delta;
            else lossTotal += Math.abs(delta);
        }
        const averageGain = gainTotal / period;
        const averageLoss = lossTotal / period;
        if (averageGain === 0 && averageLoss === 0) return 50;
        if (averageLoss === 0) return 100;
        if (averageGain === 0) return 0;
        return 100 - 100 / (1 + averageGain / averageLoss);
    });

export const buildEnrichedHistory = (points: HistoryPoint[], indicators: StockIndicator[] = []): EnrichedHistoryPoint[] => {
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

export const calculatePeriodChange = (points: Array<{ close: number | null }>): number | null => {
    const first = points.find((point) => toSafeNumber(point.close) !== null)?.close ?? null;
    const last = [...points].reverse().find((point) => toSafeNumber(point.close) !== null)?.close ?? null;
    if (first === null || last === null || first === 0) return null;
    return ((last - first) / first) * 100;
};

export const buildComparisonChartData = (
    selectedCodes: string[],
    response: CompareResponse | null,
    options: InstrumentOption[],
): { dates: string[]; series: ChartSeries[] } => {
    if (!response) return { dates: [], series: [] };

    const optionMap = new Map(options.map((option) => [option.code, option]));
    const dateSet = new Set<string>();
    selectedCodes.forEach((code) => {
        (response.series[code] ?? []).forEach((point) => { if (point.date) dateSet.add(point.date); });
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

export const getRsiComment = (value: number | null | undefined): string => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized < 30) return "Aşırı satım";
    if (normalized > 70) return "Aşırı alım";
    return "Nötr";
};

export const getMomentumComment = (value: number | null | undefined): string => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized > 0) return "Yükseliş momentumu";
    if (normalized < 0) return "Düşüş momentumu";
    return "Nötr";
};

export const getStochasticComment = (value: number | null | undefined): string => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized > 80) return "Aşırı alım";
    if (normalized < 20) return "Aşırı satım";
    return "Nötr";
};

export const getRsiContext = (value: number | null | undefined): string => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "Veri yetersiz";
    if (normalized > 70) return "Satış baskısı gelebilir";
    if (normalized >= 55) return "Alış baskısı sürüyor";
    if (normalized > 45) return "Yön dengeleniyor";
    if (normalized >= 30) return "Satış baskısı sürüyor";
    return "Tepki alımı izlenebilir";
};

export const getMacdContext = (current: number | null | undefined, previous: number | null | undefined): string => {
    const currentValue = toSafeNumber(current);
    const previousValue = toSafeNumber(previous);
    if (currentValue === null || previousValue === null) return "Veri yetersiz";
    if (currentValue > 0 && currentValue > previousValue) return "Alış baskısı güçleniyor";
    if (currentValue > 0) return "Alış baskısı sürüyor";
    if (currentValue < 0 && currentValue < previousValue) return "Satış baskısı güçleniyor";
    if (currentValue < 0) return "Satış baskısı sürüyor";
    return "Momentum yatay";
};

export const getStochasticContext = (k: number | null | undefined, d: number | null | undefined): string => {
    const kValue = toSafeNumber(k);
    const dValue = toSafeNumber(d);
    if (kValue === null || dValue === null) return "Veri yetersiz";
    if (kValue > 80) return "Satış baskısı gelebilir";
    if (kValue < 20) return "Alış baskısı gelebilir";
    if (kValue > dValue) return "Yukarı yönlü";
    if (kValue < dValue) return "Aşağı yönlü";
    return "Yön dengeleniyor";
};

export const formatIndicatorSnapshotValue = (value: number | null | undefined, digits: number): string =>
    toSafeNumber(value) === null ? "Veri yetersiz" : formatDecimal(value, digits);

export const emitIndicatorError = (message: string, error: unknown): void => {
    if (error instanceof ApiError && error.status === 401) return;
    window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, tone: "error" } }));
};
