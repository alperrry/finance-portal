import {
    fetchFx,
    fetchStocks,
    type ApiResponse,
    type FxResponse,
    type StockResponse,
} from "../../market/api/marketApi";
import { apiFetch } from "../../../services/api/client";

export type LandingMarketDirection = "up" | "down" | "neutral";

export type LandingMarketItemResponse = {
    key: string;
    instrumentType: "fx" | "stock";
    symbol: string;
    name: string;
    marketLabel: string;
    currency: string | null;
    price: number | null;
    changePercent: number | null;
    direction: LandingMarketDirection;
    dataDate: string | null;
    fetchedAt: string | null;
};

export type LandingMarketSnapshotResponse = {
    heroItems: LandingMarketItemResponse[];
    marketItems: LandingMarketItemResponse[];
    generatedAt: string;
};

const HERO_PRIORITY_KEYS = ["USD", "EUR", "THYAO.IS", "GARAN.IS", "GBP", "AKBNK.IS"] as const;
const MARKET_PRIORITY_KEYS = ["USD", "EUR", "GBP", "THYAO.IS", "GARAN.IS", "AKBNK.IS", "TUPRS.IS", "CHF", "SAR", "KWD"] as const;

function toDirection(changePercent: number | null | undefined): LandingMarketDirection {
    if (typeof changePercent !== "number" || !Number.isFinite(changePercent)) {
        return "neutral";
    }

    if (changePercent > 0) return "up";
    if (changePercent < 0) return "down";
    return "neutral";
}

function normalizeSymbol(symbol: string) {
    return symbol.replace(".IS", "");
}

function firstNonBlank(...values: Array<string | null | undefined>) {
    return values.find((value) => Boolean(value && value.trim())) ?? "";
}

function dedupeStocksByLatestSnapshot(rows: StockResponse[]) {
    const latestBySymbol = new Map<string, StockResponse>();

    rows.forEach((row) => {
        const current = latestBySymbol.get(row.symbol);
        if (!current) {
            latestBySymbol.set(row.symbol, row);
            return;
        }

        const currentTime = current.fetchedAt ? new Date(current.fetchedAt).getTime() : 0;
        const nextTime = row.fetchedAt ? new Date(row.fetchedAt).getTime() : 0;

        if (nextTime > currentTime) {
            latestBySymbol.set(row.symbol, row);
            return;
        }

        if (nextTime === currentTime && (row.tradeDate ?? "") >= (current.tradeDate ?? "")) {
            latestBySymbol.set(row.symbol, row);
        }
    });

    return [...latestBySymbol.values()];
}

function buildFxItems(rows: FxResponse[]): LandingMarketItemResponse[] {
    return rows
        .filter((row) => typeof row.forexSelling === "number" && Number.isFinite(row.forexSelling))
        .map((row) => ({
            key: row.currencyCode,
            instrumentType: "fx" as const,
            symbol: `${row.currencyCode}/TRY`,
            name: row.currencyName,
            marketLabel: "TCMB Referans",
            currency: "TRY",
            price: row.forexSelling,
            changePercent: null,
            direction: "neutral" as const,
            dataDate: row.rateDate,
            fetchedAt: null,
        }));
}

function buildStockItems(rows: StockResponse[]): LandingMarketItemResponse[] {
    return dedupeStocksByLatestSnapshot(rows)
        .filter((row) => typeof row.price === "number" && Number.isFinite(row.price))
        .map((row) => ({
            key: row.symbol,
            instrumentType: "stock" as const,
            symbol: row.shortName?.trim() ? row.shortName : normalizeSymbol(row.symbol),
            name: firstNonBlank(row.longName, row.shortName, normalizeSymbol(row.symbol)),
            marketLabel: firstNonBlank(row.indexName, "BIST"),
            currency: row.currency,
            price: row.price,
            changePercent: row.changePercent,
            direction: toDirection(row.changePercent),
            dataDate: row.tradeDate,
            fetchedAt: row.fetchedAt,
        }));
}

function selectItems(
    itemsByKey: Map<string, LandingMarketItemResponse>,
    priorityKeys: readonly string[],
    limit: number,
) {
    const selected: LandingMarketItemResponse[] = [];
    const seenKeys = new Set<string>();

    priorityKeys
        .map((key) => itemsByKey.get(key))
        .filter((item): item is LandingMarketItemResponse => Boolean(item))
        .forEach((item) => {
            if (!seenKeys.has(item.key)) {
                seenKeys.add(item.key);
                selected.push(item);
            }
        });

    itemsByKey.forEach((item) => {
        if (!seenKeys.has(item.key)) {
            seenKeys.add(item.key);
            selected.push(item);
        }
    });

    return selected.slice(0, limit);
}

function fillWithFallback(
    preferredItems: LandingMarketItemResponse[],
    fallbackItems: LandingMarketItemResponse[],
    limit: number,
) {
    const selected = [...preferredItems];
    const seenKeys = new Set(preferredItems.map((item) => item.key));

    fallbackItems.forEach((item) => {
        if (selected.length >= limit || seenKeys.has(item.key)) {
            return;
        }

        seenKeys.add(item.key);
        selected.push(item);
    });

    return selected.slice(0, limit);
}

function buildSnapshotFromExistingEndpoints(
    fxRows: FxResponse[],
    stockRows: StockResponse[],
): LandingMarketSnapshotResponse {
    const itemsByKey = new Map<string, LandingMarketItemResponse>();

    [...buildFxItems(fxRows), ...buildStockItems(stockRows)].forEach((item) => {
        itemsByKey.set(item.key, item);
    });

    const marketItems = selectItems(itemsByKey, MARKET_PRIORITY_KEYS, 6);
    let heroItems = selectItems(itemsByKey, HERO_PRIORITY_KEYS, 4);

    if (heroItems.length < 4) {
        heroItems = fillWithFallback(heroItems, marketItems, 4);
    }

    return {
        heroItems,
        marketItems,
        generatedAt: new Date().toISOString(),
    };
}

async function fetchLandingMarketSnapshotFromEndpoint() {
    const response = await apiFetch("/api/v1/landing/market-snapshot", {
        auth: "optional",
        errorMessage: "Landing piyasa ozeti yuklenemedi.",
        headers: {
            Accept: "application/json",
        },
    });

    const raw = (await response.json()) as ApiResponse<LandingMarketSnapshotResponse>;

    if (
        raw?.success !== true ||
        !raw.data ||
        !Array.isArray(raw.data.heroItems) ||
        !Array.isArray(raw.data.marketItems)
    ) {
        throw new Error("Landing piyasa ozeti icin gecersiz API cevabi alindi.");
    }

    return raw.data;
}

export async function fetchLandingMarketSnapshot() {
    try {
        return await fetchLandingMarketSnapshotFromEndpoint();
    } catch {
        const [fxRows, stockRows] = await Promise.all([fetchFx({ auth: "optional" }), fetchStocks({ auth: "optional" })]);
        return buildSnapshotFromExistingEndpoints(fxRows, stockRows);
    }
}
