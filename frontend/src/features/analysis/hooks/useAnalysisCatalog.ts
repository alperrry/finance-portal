import { useQuery } from "@tanstack/react-query";
import { fetchBonds, fetchFunds, fetchFx, fetchStocks } from "../../market/api/marketApi";
import type { CatalogState } from "../types";
import { TYPE_ORDER } from "../types";
import {
    buildCatalogFromBonds,
    buildCatalogFromFunds,
    buildCatalogFromFx,
    buildCatalogFromStocks,
    createEmptyCatalog,
} from "../utils/analysisFormatters";

async function fetchCatalogData() {
    const [stocksResult, indexesResult, commoditiesResult, cryptoResult, fxResult, fundsResult, bondsResult] = await Promise.allSettled([
        fetchStocks(),
        fetchStocks(undefined, "INDEX"),
        fetchStocks(undefined, "COMMODITY"),
        fetchStocks(undefined, "CRYPTO"),
        fetchFx(),
        fetchFunds(),
        fetchBonds(),
    ]);

    const nextCatalog = createEmptyCatalog();
    const failedGroups: string[] = [];

    if (stocksResult.status === "fulfilled") {
        nextCatalog.stocks = buildCatalogFromStocks(stocksResult.value);
    } else {
        failedGroups.push("hisse");
    }
    if (indexesResult.status === "fulfilled") {
        nextCatalog.indexes = buildCatalogFromStocks(indexesResult.value);
    } else {
        failedGroups.push("endeks");
    }
    if (commoditiesResult.status === "fulfilled") {
        nextCatalog.commodities = buildCatalogFromStocks(commoditiesResult.value);
    } else {
        failedGroups.push("emtia");
    }
    if (cryptoResult.status === "fulfilled") {
        nextCatalog.crypto = buildCatalogFromStocks(cryptoResult.value);
    } else {
        failedGroups.push("kripto");
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
    const error = !hasAnyOptions
        ? "Enstrüman listeleri yüklenemedi."
        : failedGroups.length > 0
          ? `Bazı listeler eksik: ${failedGroups.join(", ")}.`
          : null;

    return { catalog: nextCatalog, error };
}

export function useAnalysisCatalog(): CatalogState {
    const { data, isLoading } = useQuery({
        queryKey: ["analysis", "catalog"],
        queryFn: fetchCatalogData,
        staleTime: 5 * 60 * 1000,
    });

    return {
        data: data?.catalog ?? createEmptyCatalog(),
        loading: isLoading,
        error: data?.error ?? null,
    };
}
