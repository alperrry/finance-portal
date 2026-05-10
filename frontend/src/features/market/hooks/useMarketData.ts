import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBonds, fetchFunds, fetchFx, fetchStocks } from "../api/marketApi";
import { useAuth } from "../../../app/auth/AuthContext";
import { websocketClient } from "../../../services/websocketClient";
import type { MarketData, StockPricesUpdatedPayload } from "../types";

async function fetchAllMarketData(): Promise<MarketData> {
    const [fx, bonds, funds, stocks] = await Promise.all([fetchFx(), fetchBonds(), fetchFunds(), fetchStocks()]);
    return { fx, bonds, funds, stocks };
}

export function useMarketData() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
        queryKey: ["market", "data"],
        queryFn: fetchAllMarketData,
        staleTime: 2 * 60 * 1000,
    });

    useEffect(() => {
        if (!token) return undefined;

        websocketClient.connect(token);

        const unsubscribe = websocketClient.subscribe<StockPricesUpdatedPayload>(
            "/topic/market/stocks/prices",
            (envelope) => {
                if (envelope.type !== "STOCK_PRICES_UPDATED") return;

                const snapshots = envelope.data?.snapshots;
                if (!snapshots || snapshots.length === 0) return;

                queryClient.setQueryData<MarketData>(["market", "data"], (current) => {
                    if (!current) {
                        void refetch();
                        return current;
                    }

                    const updatesByStockId = new Map(
                        snapshots
                            .filter((s) => typeof s.stockId === "number")
                            .map((s) => [s.stockId as number, s]),
                    );

                    if (updatesByStockId.size === 0) return current;

                    const knownIds = new Set(
                        current.stocks.map((s) => s.id).filter((id): id is number => typeof id === "number"),
                    );
                    const hasUnknown = [...updatesByStockId.keys()].some((id) => !knownIds.has(id));

                    if (hasUnknown) {
                        void refetch();
                    }

                    let changed = false;
                    const stocks = current.stocks.map((stock) => {
                        if (typeof stock.id !== "number") return stock;

                        const update = updatesByStockId.get(stock.id);
                        if (!update) return stock;

                        changed = true;
                        return {
                            ...stock,
                            price: update.price ?? stock.price,
                            change: update.change ?? stock.change,
                            changePercent: update.changePercent ?? stock.changePercent,
                            dayHigh: update.dayHigh ?? stock.dayHigh,
                            dayLow: update.dayLow ?? stock.dayLow,
                            volume: update.volume ?? stock.volume,
                            fetchedAt: update.fetchedAt ?? envelope.data?.fetchedAt ?? stock.fetchedAt,
                        };
                    });

                    return changed ? { ...current, stocks } : current;
                });
            },
        );

        return () => {
            unsubscribe();
            websocketClient.disconnectIfIdle();
        };
    }, [token, queryClient, refetch]);

    return {
        data: data ?? null,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Piyasa verileri yüklenemedi.") : null,
        lastSyncedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
        reload: () => void refetch(),
    };
}
