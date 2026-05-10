import type { ApiResponse } from "../../market/api/marketApi";
import { apiFetch } from "../../../services/api/client";
import type { StockIndicator } from "../../../types/indicator";

type RawStockIndicator = {
    symbol?: unknown;
    tradeDate?: unknown;
    rsi14?: unknown;
    macdLine?: unknown;
    macdSignal?: unknown;
    macdHistogram?: unknown;
    sma20?: unknown;
    sma50?: unknown;
    sma200?: unknown;
    ema12?: unknown;
    ema26?: unknown;
    bollingerUpper?: unknown;
    bollingerMiddle?: unknown;
    bollingerLower?: unknown;
    stochasticK?: unknown;
    stochasticD?: unknown;
    atr14?: unknown;
    ichimokuTenkan?: unknown;
    ichimokuKijun?: unknown;
    ichimokuSenkouA?: unknown;
    ichimokuSenkouB?: unknown;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toFiniteNumber = (value: unknown) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

const toIsoDate = (value: unknown) =>
    typeof value === "string" && ISO_DATE_PATTERN.test(value) ? value : "";

const normalizeIndicator = (raw: RawStockIndicator, fallbackSymbol: string): StockIndicator => ({
    symbol: typeof raw.symbol === "string" && raw.symbol.length > 0 ? raw.symbol : fallbackSymbol,
    tradeDate: toIsoDate(raw.tradeDate),
    rsi14: toFiniteNumber(raw.rsi14),
    macdLine: toFiniteNumber(raw.macdLine),
    macdSignal: toFiniteNumber(raw.macdSignal),
    macdHistogram: toFiniteNumber(raw.macdHistogram),
    sma20: toFiniteNumber(raw.sma20),
    sma50: toFiniteNumber(raw.sma50),
    sma200: toFiniteNumber(raw.sma200),
    ema12: toFiniteNumber(raw.ema12),
    ema26: toFiniteNumber(raw.ema26),
    bollingerUpper: toFiniteNumber(raw.bollingerUpper),
    bollingerMiddle: toFiniteNumber(raw.bollingerMiddle),
    bollingerLower: toFiniteNumber(raw.bollingerLower),
    stochasticK: toFiniteNumber(raw.stochasticK),
    stochasticD: toFiniteNumber(raw.stochasticD),
    atr14: toFiniteNumber(raw.atr14),
    ichimokuTenkan: toFiniteNumber(raw.ichimokuTenkan),
    ichimokuKijun: toFiniteNumber(raw.ichimokuKijun),
    ichimokuSenkouA: toFiniteNumber(raw.ichimokuSenkouA),
    ichimokuSenkouB: toFiniteNumber(raw.ichimokuSenkouB),
});

async function fetchIndicatorPayload<T>(path: string, errorMessage: string): Promise<T> {
    const response = await apiFetch(path, {
        errorMessage,
        headers: {
            Accept: "application/json",
        },
    });

    const raw = (await response.json()) as ApiResponse<T>;
    if (raw?.success !== true || raw.data === undefined || raw.data === null) {
        throw new Error(`${errorMessage} Geçersiz API cevabı alındı.`);
    }

    return raw.data;
}

export async function getLatestIndicator(symbol: string): Promise<StockIndicator> {
    const raw = await fetchIndicatorPayload<RawStockIndicator>(
        `/api/v1/stocks/${encodeURIComponent(symbol)}/indicators/latest`,
        "Güncel indikatör verisi yüklenemedi."
    );

    return normalizeIndicator(raw, symbol);
}

export async function getIndicatorHistory(symbol: string, from: string, to: string): Promise<StockIndicator[]> {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);

    const raw = await fetchIndicatorPayload<RawStockIndicator[]>(
        `/api/v1/stocks/${encodeURIComponent(symbol)}/indicators?${params.toString()}`,
        "İndikatör geçmişi yüklenemedi."
    );

    return Array.isArray(raw) ? raw.map((item) => normalizeIndicator(item, symbol)) : [];
}
