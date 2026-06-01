import type { FxResponse } from "../../market/api/marketApi";
import type { DisplayCurrency, ManualPositionResponse, PortfolioInstrumentType, PortfolioItemResponse } from "../api/portfolioApi";
import { CHART_PALETTE, getInstrumentLabels, TYPE_COLORS, type FxRateMap } from "../types";

export function toNumber(value: number | null | undefined): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
}

export function formatQuantity(value: number | null | undefined): string {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(normalized);
}

export function formatMoney(value: number | null | undefined, currency = "TRY", digits = 2): string {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    try {
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).format(normalized);
    } catch {
        return `${formatNumber(normalized, digits)} ${currency}`;
    }
}

export function formatPercent(value: number | null | undefined): string {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, 2)}%`;
}

export function formatSignedMoney(value: number | null | undefined, currency = "TRY"): string {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatMoney(normalized, currency)}`;
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function getProfitTone(value: number | null | undefined): "up" | "down" | "neutral" {
    const normalized = toNumber(value);
    if (normalized === null || normalized === 0) return "neutral";
    return normalized > 0 ? "up" : "down";
}

export function currencyBadgeClass(currency: string): string {
    const normalized = currency.toLowerCase();
    if (normalized === "try" || normalized === "usd" || normalized === "eur" || normalized === "btc") {
        return `portfolio-currency-badge currency-${normalized}`;
    }
    return "portfolio-currency-badge currency-other";
}

export function buildFxRateMap(items: FxResponse[]): FxRateMap {
    return items.reduce<FxRateMap>(
        (rates, item) => {
            if ((item.currencyCode === "USD" || item.currencyCode === "EUR") && typeof item.forexBuying === "number") {
                rates[item.currencyCode as DisplayCurrency] = item.forexBuying;
            }
            return rates;
        },
        { TRY: 1 },
    );
}

export function convertMoneyValue(
    amount: number | null,
    fromCurrency: string | null | undefined,
    toCurrency: string,
    rates: FxRateMap,
): number | null {
    if (amount === null || !Number.isFinite(amount)) return null;
    const from = (fromCurrency || "TRY").toUpperCase() as DisplayCurrency;
    const to = (toCurrency || "TRY").toUpperCase() as DisplayCurrency;
    if (from === to) return amount;

    const fromRate = from === "TRY" ? 1 : rates[from];
    const toRate = to === "TRY" ? 1 : rates[to];
    if (!fromRate || !toRate) return null;

    const amountInTry = amount * fromRate;
    return to === "TRY" ? amountInTry : amountInTry / toRate;
}

export function resolveApiError(caughtError: unknown, fallback: string): string {
    if (caughtError instanceof Error) {
        const anyError = caughtError as { payload?: { message?: string } };
        return anyError.payload?.message || caughtError.message || fallback;
    }
    return fallback;
}

export type TypeGroupEntry = {
    type: PortfolioInstrumentType;
    label: string;
    value: number;
    fill: string;
    totalPnl: number | null;
    positions: Array<{ id: number; name: string; value: number; fill: string }>;
};

function computePositionValue(pos: ManualPositionResponse): number {
    if (pos.currentValue != null) return pos.currentValue;
    const price = pos.currentPrice ?? pos.entryPrice;
    const multiplier = pos.contractMultiplier ?? 1;
    return price * pos.quantity * multiplier;
}

export function buildTypeGroupData(positions: ManualPositionResponse[]): TypeGroupEntry[] {
    const map = new Map<PortfolioInstrumentType, TypeGroupEntry>();

    for (const pos of positions) {
        const value = computePositionValue(pos);
        if (value <= 0) continue;

        const type = pos.instrumentType;
        if (!map.has(type)) {
            map.set(type, {
                type,
                label: getInstrumentLabels()[type],
                value: 0,
                fill: TYPE_COLORS[type],
                totalPnl: null,
                positions: [],
            });
        }

        const entry = map.get(type)!;
        entry.value += value;

        const pnl = pos.unrealizedPnl ?? pos.realizedPnl;
        if (pnl !== null) {
            entry.totalPnl = (entry.totalPnl ?? 0) + pnl;
        }

        entry.positions.push({
            id: pos.id,
            name: pos.instrumentSymbol || pos.instrumentName || `${getInstrumentLabels()[type]} #${pos.id}`,
            value,
            fill: TYPE_COLORS[type],
        });
    }

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export function calcMaturityValue(pos: ManualPositionResponse): number | null {
    if (!pos.interestRate || !pos.maturityDate || !pos.entryDate) return null;
    const principal = pos.entryPrice * (pos.quantity ?? 1);
    const start = new Date(pos.entryDate);
    const end = new Date(pos.maturityDate);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return null;
    return principal * (1 + (pos.interestRate / 100) * (days / 365));
}

export function buildAllocationData(items: PortfolioItemResponse[]): Array<{ id: number; name: string; quantity: number; type: PortfolioInstrumentType; value: number; fill: string }> {
    return items
        .map((item, index) => ({
            id: item.id,
            name: item.instrumentSymbol || `${getInstrumentLabels()[item.instrumentType]} #${item.instrumentId}`,
            quantity: item.quantity,
            type: item.instrumentType,
            value: toNumber(item.currentValue) ?? 0,
            fill: CHART_PALETTE[index % CHART_PALETTE.length],
        }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value);
}
