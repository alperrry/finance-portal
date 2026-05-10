import { useQuery } from "@tanstack/react-query";
import { fetchLandingMarketSnapshot } from "../api/landingApi";
import type { MarketSnapshot } from "../types";

const EMPTY_SNAPSHOT: MarketSnapshot = {
    heroItems: [],
    marketItems: [],
    generatedAt: "",
};

export function useMarketSnapshot() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["landing", "snapshot"],
        queryFn: fetchLandingMarketSnapshot,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });

    return {
        snapshot: data ?? EMPTY_SNAPSHOT,
        loading: isLoading,
        error: isError,
    };
}
