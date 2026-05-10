import type { ApiResponse } from "../../market/api/marketApi";
import { apiFetch } from "../../../services/api/client";

export type InstrumentType = "stocks" | "fx" | "funds" | "bonds";

export type HistoryPoint = {
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
};

export type HistoryResponse = {
    code: string;
    instrumentType: string;
    from: string;
    to: string;
    data: HistoryPoint[];
};

export type CompareResponse = {
    from: string;
    to: string;
    instrumentType: string;
    series: Record<string, HistoryPoint[]>;
};

type RawHistoryPoint = {
    date?: string;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    close?: number | null;
    volume?: number | null;
};

type RawHistoryResponse = {
    code?: string;
    instrumentType?: string;
    from?: string;
    to?: string;
    data?: RawHistoryPoint[];
};

type RawCompareResponse = {
    from?: string;
    to?: string;
    instrumentType?: string;
    series?: Record<string, RawHistoryPoint[]>;
};

const toFiniteNumber = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeHistoryPoint = (point: RawHistoryPoint): HistoryPoint => ({
    date: point.date ?? "",
    open: toFiniteNumber(point.open),
    high: toFiniteNumber(point.high),
    low: toFiniteNumber(point.low),
    close: toFiniteNumber(point.close),
    volume: toFiniteNumber(point.volume),
});

async function fetchPayload<T>(path: string, errorMessage: string): Promise<T> {
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

export async function fetchInstrumentHistory(
    type: InstrumentType,
    code: string,
    from: string,
    to: string
): Promise<HistoryResponse> {
    const raw = await fetchPayload<RawHistoryResponse>(
        `/api/v1/history/${type}/${encodeURIComponent(code)}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        "Tarihsel veri yüklenemedi."
    );

    return {
        code: raw.code ?? code,
        instrumentType: raw.instrumentType ?? type.toUpperCase(),
        from: raw.from ?? from,
        to: raw.to ?? to,
        data: Array.isArray(raw.data) ? raw.data.map(normalizeHistoryPoint) : [],
    };
}

export async function fetchHistoryCompare(
    type: InstrumentType,
    codes: string[],
    from: string,
    to: string
): Promise<CompareResponse> {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("codes", codes.join(","));
    params.set("from", from);
    params.set("to", to);

    const raw = await fetchPayload<RawCompareResponse>(
        `/api/v1/history/compare?${params.toString()}`,
        "Karşılaştırma verisi yüklenemedi."
    );

    const normalizedSeries: Record<string, HistoryPoint[]> = {};
    Object.entries(raw.series ?? {}).forEach(([seriesCode, points]) => {
        normalizedSeries[seriesCode] = Array.isArray(points) ? points.map(normalizeHistoryPoint) : [];
    });

    return {
        from: raw.from ?? from,
        to: raw.to ?? to,
        instrumentType: raw.instrumentType ?? type.toUpperCase(),
        series: normalizedSeries,
    };
}
