import { useQuery } from "@tanstack/react-query";
import {
    fetchBonds,
    fetchFunds,
    fetchFx,
    fetchMacroDepositRates,
    fetchMacroInflation,
    fetchStocks,
    fetchViop,
} from "../api/marketApi";
import type { MarketData } from "../types";

async function fetchAllMarketData(): Promise<MarketData> {
    const [fx, bonds, funds, stocks, indexes, commodities, crypto, macroInflation, macroDepositRates, viop] = await Promise.all([
        fetchFx(),
        fetchBonds(),
        fetchFunds(),
        fetchStocks(),
        fetchStocks(undefined, "INDEX"),
        fetchStocks(undefined, "COMMODITY"),
        fetchStocks(undefined, "CRYPTO"),
        fetchMacroInflation(),
        fetchMacroDepositRates(),
        fetchViop(),
    ]);
    return { fx, bonds, funds, stocks, indexes, commodities, crypto, macroInflation, macroDepositRates, viop };
}

export function useMarketData() {
    const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
        queryKey: ["market", "data"],
        queryFn: fetchAllMarketData,
        staleTime: 2 * 60 * 1000,
    });

    return {
        data: data ?? null,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Piyasa verileri yüklenemedi.") : null,
        lastSyncedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
        reload: () => void refetch(),
    };
}
