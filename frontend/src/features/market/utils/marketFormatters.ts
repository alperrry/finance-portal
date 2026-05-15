import type { InstrumentType } from "../../analysis/api/historyApi";

export const toSafeNumber = (value: number | null | undefined): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

export function formatNumber(value: number | null | undefined, digits = 2): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
}

export function formatWholeNumber(value: number | null | undefined): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: 0,
    }).format(normalized);
}

export function formatCompactNumber(value: number | null | undefined): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const absolute = Math.abs(normalized);

    if (absolute >= 1_000_000_000) return `${formatNumber(normalized / 1_000_000_000, 1)} Mr`;
    if (absolute >= 1_000_000) return `${formatNumber(normalized / 1_000_000, 1)} Mn`;
    if (absolute >= 1_000) return `${formatNumber(normalized / 1_000, 1)} Bin`;

    return formatWholeNumber(normalized);
}

export function formatRate(value: number | null | undefined): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const digits = Math.abs(normalized) >= 10 ? 4 : 5;
    return formatNumber(normalized, digits);
}

export function formatSignedNumber(value: number | null | undefined, digits = 2): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, digits)}`;
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, digits)}%`;
}

export function formatMoney(value: number | null | undefined, currency = "TRY", digits = 2): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const formatted = formatNumber(normalized, digits);
    if (currency === "TRY") return `₺${formatted}`;
    if (currency === "USD") return `$${formatted}`;
    if (currency === "EUR") return `€${formatted}`;
    return `${formatted} ${currency}`;
}

export function formatCompactMoney(value: number | null | undefined, currency = "TRY"): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const formatted = formatCompactNumber(normalized);
    if (currency === "TRY") return `₺${formatted}`;
    if (currency === "USD") return `$${formatted}`;
    if (currency === "EUR") return `€${formatted}`;
    return `${formatted} ${currency}`;
}

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
});

export function formatLocalDate(value: string | null | undefined): string {
    if (!value) return "-";

    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "-";
    return dateFormatter.format(date);
}

export function formatShortDate(value: string | null | undefined): string {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return shortDateFormatter.format(date);
}

export function formatLocalDateTime(value: string | Date | null | undefined): string {
    if (!value) return "-";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function formatUnitLabel(unit: number | null | undefined, currencyCode: string): string {
    const normalized = toSafeNumber(unit);
    if (normalized === null || normalized <= 1) return currencyCode;
    return `${formatWholeNumber(normalized)} ${currencyCode}`;
}

export function formatCurrencyValue(value: number | null | undefined, currency = "TRY", digits = 2): string {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const formatted = formatNumber(normalized, digits);
    if (currency === "TRY") return `₺${formatted}`;
    if (currency === "USD") return `$${formatted}`;
    if (currency === "EUR") return `€${formatted}`;
    return `${formatted} ${currency}`;
}

export function getValueDigits(type: InstrumentType, value: number | null | undefined): number {
    const normalized = toSafeNumber(value);
    if (normalized === null) return type === "funds" ? 4 : 2;

    if (type === "fx") return Math.abs(normalized) >= 10 ? 4 : 5;
    if (type === "funds") return 4;
    return 2;
}

export function formatValueByType(type: InstrumentType, value: number | null | undefined, currency?: string | null): string {
    const digits = getValueDigits(type, value);

    if (type === "stocks" || type === "indexes" || type === "commodities" || type === "crypto") {
        return formatCurrencyValue(value, currency ?? "TRY", digits);
    }
    if (type === "funds") return formatCurrencyValue(value, "TRY", digits);
    if (type === "bonds") return value === null || value === undefined ? "-" : `%${formatNumber(value, digits)}`;

    return formatNumber(value, digits);
}
