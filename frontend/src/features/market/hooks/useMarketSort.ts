import { useState } from "react";
import type { MarketTab, MarketSortKey, MarketSortState } from "../types";
import { DEFAULT_SORT_STATE } from "../types";

type UseMarketSort = {
    sortState: MarketSortState;
    toggleSort: (tab: MarketTab, key: MarketSortKey) => void;
};

export function useMarketSort(): UseMarketSort {
    const [sortState, setSortState] = useState<MarketSortState>(DEFAULT_SORT_STATE);

    const toggleSort = (tab: MarketTab, key: MarketSortKey) => {
        setSortState((current) => {
            const currentSort = current[tab];
            return {
                ...current,
                [tab]: {
                    key,
                    direction: currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc",
                },
            };
        });
    };

    return { sortState, toggleSort };
}
