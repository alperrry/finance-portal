import { useEffect } from "react";
import i18n from "../../../i18n";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../app/auth/AuthContext";
import { MARKET_UPDATE_TOPICS, websocketClient } from "../../../services/websocketClient";
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
    const { token } = useAuth();
    const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
        queryKey: ["market", "data"],
        queryFn: fetchAllMarketData,
        staleTime: 2 * 60 * 1000,
    });

    useEffect(() => {
        if (!token) {
            websocketClient.disconnectIfIdle();
            return undefined;
        }

        websocketClient.connect(token);
        const unsubscribers = MARKET_UPDATE_TOPICS.map((topic) =>
            websocketClient.subscribe(topic, () => {
                void refetch();
            }),
        );

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
            websocketClient.disconnectIfIdle();
        };
    }, [refetch, token]);

    return {
        data: data ?? null,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : i18n.t("market.errors.marketData")) : null,
        lastSyncedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
        reload: () => void refetch(),
    };
}
