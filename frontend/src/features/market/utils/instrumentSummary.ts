import { fetchBonds, fetchFunds, fetchFx, fetchStocks } from "../api/marketApi";
import type { BondResponse, FundResponse, FxResponse, StockResponse } from "../api/marketApi";
import type { InstrumentType, HistoryPoint } from "../../analysis/api/historyApi";
import type { RangeKey, InstrumentSummary } from "../types";
import { RANGE_OPTIONS } from "../types";
import {
    toSafeNumber,
    formatNumber,
    formatCompactNumber,
    formatLocalDate,
    formatCurrencyValue,
    getValueDigits,
} from "./marketFormatters";

export const stripMarketSuffix = (code: string) => code.replace(/\.IS$/i, "").trim();

const normalizeNameForQuery = (value: string) =>
    value
        .replace(/\bT\.?A\.?S\.?\b/gi, "")
        .replace(/\bA\.?S\.?\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

export function buildNewsQuery(instrument: InstrumentSummary): string {
    switch (instrument.type) {
        case "stocks":
        case "indexes":
        case "commodities":
        case "crypto": {
            const code = stripMarketSuffix(instrument.code);
            const normalizedName = normalizeNameForQuery(instrument.title).split(" ").slice(0, 3).join(" ");
            return normalizedName && normalizedName.toLocaleLowerCase("tr-TR") !== code.toLocaleLowerCase("tr-TR")
                ? `${code} OR "${normalizedName}"`
                : code;
        }
        case "fx":    return `${instrument.code} kuru`;
        case "funds": return `${instrument.code} fon`;
        case "bonds": return instrument.code;
    }
}

export function buildStockInstrumentSummary(row: StockResponse, code: string, type: InstrumentType = "stocks"): InstrumentSummary {
    return {
        type,
        code,
        title: row.longName ?? row.shortName ?? code,
        subtitle: row.shortName && row.longName && row.shortName !== row.longName
            ? row.shortName
            : row.sector ?? row.indexName ?? row.instrumentType,
        helper: "Fiyat ve grafik günlük kapanış serisinden gelir.",
        currency: row.currency ?? "TRY",
        latestValue: row.price,
        latestDate: row.tradeDate,
        snapshotChange: row.changePercent,
        newsQuery: stripMarketSuffix(code),
        stats: [
            { label: "Açılış", value: formatCurrencyValue(row.open, row.currency ?? "TRY") },
            { label: "Gün İçi Yüksek", value: formatCurrencyValue(row.dayHigh, row.currency ?? "TRY") },
            { label: "Gün İçi Düşük", value: formatCurrencyValue(row.dayLow, row.currency ?? "TRY") },
            { label: "Hacim", value: formatCompactNumber(row.volume) },
        ],
    };
}

export function buildFxInstrumentSummary(row: FxResponse, code: string): InstrumentSummary {
    return {
        type: "fx",
        code,
        title: row.currencyName,
        subtitle: `${row.unit > 1 ? row.unit : 1} birim / TRY`,
        helper: "Grafik, TCMB tarihsel kur serisini kullanır.",
        currency: null,
        latestValue: row.forexSelling ?? row.forexBuying,
        latestDate: row.rateDate,
        snapshotChange: null,
        newsQuery: `${code} kuru`,
        stats: [
            { label: "Alış",   value: formatNumber(row.forexBuying, getValueDigits("fx", row.forexBuying)) },
            { label: "Satış",  value: formatNumber(row.forexSelling, getValueDigits("fx", row.forexSelling)) },
            {
                label: "Makas",
                value: toSafeNumber(row.forexBuying) !== null && toSafeNumber(row.forexSelling) !== null
                    ? formatNumber((row.forexSelling ?? 0) - (row.forexBuying ?? 0), getValueDigits("fx", row.forexSelling))
                    : "-",
            },
            { label: "Tarih", value: formatLocalDate(row.rateDate) },
        ],
    };
}

export function buildFundInstrumentSummary(row: FundResponse, code: string): InstrumentSummary {
    return {
        type: "funds",
        code,
        title: row.name,
        subtitle: row.fundType ?? "Yatırım Fonu",
        helper: "Grafik, TEFAS fiyat serisinden üretilir.",
        currency: "TRY",
        latestValue: row.price,
        latestDate: row.priceDate,
        snapshotChange: null,
        newsQuery: `${code} fon`,
        stats: [
            { label: "Yatırımcı",  value: formatCompactNumber(row.investorCount) },
            { label: "Portföy",    value: formatCurrencyValue(row.portfolioSize, "TRY") },
            { label: "Pay Adedi",  value: formatCompactNumber(row.totalShares) },
            { label: "Tarih",      value: formatLocalDate(row.priceDate) },
        ],
    };
}

export function buildBondInstrumentSummary(row: BondResponse, code: string): InstrumentSummary {
    return {
        type: "bonds",
        code,
        title: row.name,
        subtitle: row.bondType ?? row.currency ?? "Tahvil/Bono",
        helper: "Grafik, EVDS faiz serisinden üretilir.",
        currency: null,
        latestValue: row.compoundedRate ?? row.interestRate,
        latestDate: row.rateDate,
        snapshotChange: null,
        newsQuery: code,
        stats: [
            { label: "Faiz",    value: row.interestRate === null ? "-" : `%${formatNumber(row.interestRate, 2)}` },
            { label: "Bileşik", value: row.compoundedRate === null ? "-" : `%${formatNumber(row.compoundedRate, 2)}` },
            { label: "Vade",    value: row.maturityDays === null ? "-" : `${formatCompactNumber(row.maturityDays)} gün` },
            { label: "Tarih",   value: formatLocalDate(row.rateDate) },
        ],
    };
}

export async function fetchInstrumentSummary(type: InstrumentType, code: string): Promise<InstrumentSummary> {
    switch (type) {
        case "stocks": {
            const rows = await fetchStocks();
            const match = rows.find((r) => r.symbol === code);
            return match
                ? buildStockInstrumentSummary(match, code)
                : { type, code, title: code, subtitle: "Hisse", helper: "Hisse detayları bulunamadı, grafik tarihsel seriden çiziliyor.", currency: "TRY", latestValue: null, latestDate: null, snapshotChange: null, newsQuery: stripMarketSuffix(code), stats: [] };
        }
        case "indexes":
        case "commodities":
        case "crypto": {
            const apiType = type === "indexes" ? "INDEX" : type === "commodities" ? "COMMODITY" : "CRYPTO";
            const rows = await fetchStocks(undefined, apiType);
            const match = rows.find((r) => r.symbol === code);
            return match
                ? buildStockInstrumentSummary(match, code, type)
                : { type, code, title: code, subtitle: apiType, helper: "Detaylar bulunamadı, grafik tarihsel seriden çiziliyor.", currency: "TRY", latestValue: null, latestDate: null, snapshotChange: null, newsQuery: stripMarketSuffix(code), stats: [] };
        }
        case "fx": {
            const rows = await fetchFx();
            const match = rows.find((r) => r.currencyCode === code);
            return match
                ? buildFxInstrumentSummary(match, code)
                : { type, code, title: code, subtitle: "Döviz", helper: "Döviz detayları bulunamadı, grafik tarihsel seriden çiziliyor.", currency: null, latestValue: null, latestDate: null, snapshotChange: null, newsQuery: `${code} kuru`, stats: [] };
        }
        case "funds": {
            const rows = await fetchFunds();
            const match = rows.find((r) => r.code === code);
            return match
                ? buildFundInstrumentSummary(match, code)
                : { type, code, title: code, subtitle: "Fon", helper: "Fon detayları bulunamadı, grafik tarihsel seriden çiziliyor.", currency: "TRY", latestValue: null, latestDate: null, snapshotChange: null, newsQuery: `${code} fon`, stats: [] };
        }
        case "bonds": {
            const rows = await fetchBonds();
            const match = rows.find((r) => r.evdsSeriesCode === code);
            return match
                ? buildBondInstrumentSummary(match, code)
                : { type, code, title: code, subtitle: "Tahvil/Bono", helper: "Tahvil detayları bulunamadı, grafik tarihsel seriden çiziliyor.", currency: null, latestValue: null, latestDate: null, snapshotChange: null, newsQuery: code, stats: [] };
        }
    }
}

// History stat helpers
export const getLastClose = (points: HistoryPoint[]): number | null =>
    [...points].reverse().find((p) => toSafeNumber(p.close) !== null)?.close ?? null;

export const getFirstClose = (points: HistoryPoint[]): number | null =>
    points.find((p) => toSafeNumber(p.close) !== null)?.close ?? null;

export const calculatePeriodChange = (points: HistoryPoint[]): number | null => {
    const first = getFirstClose(points);
    const last = getLastClose(points);
    if (first === null || last === null || first === 0) return null;
    return ((last - first) / first) * 100;
};

export const getSeriesHigh = (points: HistoryPoint[]): number | null => {
    const values = points
        .map((p) => toSafeNumber(p.high) ?? toSafeNumber(p.close))
        .filter((v): v is number => v !== null);
    return values.length > 0 ? Math.max(...values) : null;
};

export const getSeriesLow = (points: HistoryPoint[]): number | null => {
    const values = points
        .map((p) => toSafeNumber(p.low) ?? toSafeNumber(p.close))
        .filter((v): v is number => v !== null);
    return values.length > 0 ? Math.min(...values) : null;
};

export const getLastVolume = (points: HistoryPoint[]): number | null =>
    [...points].reverse().find((p) => toSafeNumber(p.volume) !== null)?.volume ?? null;

export function getDisplayLatestValue(summary: InstrumentSummary, latestClose: number | null): number | null {
    return summary.type === "stocks" ? summary.latestValue : latestClose ?? summary.latestValue;
}

export function getDisplayLatestNote(
    summary: InstrumentSummary,
    latestClose: number | null,
    historyTo: string | null | undefined,
): string {
    return summary.type === "stocks"
        ? `${formatLocalDate(summary.latestDate)} günlük kapanış`
        : latestClose !== null
          ? `${formatLocalDate(historyTo)}`
          : summary.helper;
}

// Date range helpers
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

export function getRangeDates(range: RangeKey, today: Date): { from: string; to: string } {
    const config = RANGE_OPTIONS.find((o) => o.key === range) ?? RANGE_OPTIONS[2];
    const to = new Date(today);
    const from = config.months ? subtractMonths(to, config.months) : subtractDays(to, config.days ?? 365);
    return { from: toIsoDate(from), to: toIsoDate(to) };
}

// SVG chart utilities
export const getTickIndexes = (length: number, tickCount: number): number[] => {
    if (length <= 0) return [];
    if (length === 1) return [0];

    const indexes = new Set<number>();
    for (let i = 0; i < tickCount; i += 1) {
        indexes.add(Math.round((i / (tickCount - 1)) * (length - 1)));
    }
    return Array.from(indexes).sort((a, b) => a - b);
};

export const getLinearTicks = (minimum: number, maximum: number, count: number): number[] => {
    if (count <= 1) return [minimum];
    if (minimum === maximum) return [minimum];
    return Array.from({ length: count }, (_, i) => maximum - ((maximum - minimum) * i) / (count - 1));
};

export const createLinePath = (
    values: Array<number | null>,
    xAt: (index: number) => number,
    yAt: (value: number) => number,
): string => {
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
