import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarketData } from "./useMarketData";
import { useMarketSort } from "./useMarketSort";
import {
    dedupeStocksByLatestSnapshot,
    getLatestDatasetDate,
    getSummaryCards,
    matchesSearch,
    sortBondRows,
    sortFundRows,
    sortFxRows,
    sortStockRows,
} from "../utils/marketSorters";
import { MARKET_TABS } from "../types";
import type { MarketTab } from "../types";

export function useMarketPage() {
    const navigate = useNavigate();
    const { data, loading, error, lastSyncedAt, reload } = useMarketData();
    const { sortState, toggleSort } = useMarketSort();
    const [activeTab, setActiveTab] = useState<MarketTab>("fx");
    const [query, setQuery] = useState("");

    const activeMeta = MARKET_TABS.find((tab) => tab.key === activeTab) ?? MARKET_TABS[0];
    const isInitialLoading = loading && data === null;
    const isRefreshing = loading && data !== null;

    const dedupedStocks = useMemo(
        () => (data ? dedupeStocksByLatestSnapshot(data.stocks) : []),
        [data],
    );

    const fxRows = useMemo(
        () => data ? sortFxRows(data.fx.filter((r) => matchesSearch(query, r.currencyCode, r.currencyName)), sortState.fx) : [],
        [data, query, sortState.fx],
    );
    const bondRows = useMemo(
        () => data ? sortBondRows(data.bonds.filter((r) => matchesSearch(query, r.name, r.currency, r.bondType, r.evdsSeriesCode)), sortState.bonds) : [],
        [data, query, sortState.bonds],
    );
    const fundRows = useMemo(
        () => data ? sortFundRows(data.funds.filter((r) => matchesSearch(query, r.code, r.name, r.fundType)), sortState.funds) : [],
        [data, query, sortState.funds],
    );
    const stockRows = useMemo(
        () => data ? sortStockRows(dedupedStocks.filter((r) => matchesSearch(query, r.symbol, r.shortName, r.longName, r.sector, r.indexName)), sortState.stocks) : [],
        [data, dedupedStocks, query, sortState.stocks],
    );

    const summaryCards = useMemo(
        () => data ? getSummaryCards(activeTab, { ...data, stocks: dedupedStocks }) : [],
        [activeTab, data, dedupedStocks],
    );
    const activeDatasetDate = useMemo(
        () => (data ? getLatestDatasetDate(activeTab, data) : "-"),
        [activeTab, data],
    );

    const visibleCount =
        activeTab === "fx" ? fxRows.length
            : activeTab === "bonds" ? bondRows.length
                : activeTab === "funds" ? fundRows.length
                    : stockRows.length;

    const totalCount = data
        ? (activeTab === "stocks" ? dedupedStocks.length : data[activeTab].length)
        : 0;

    const stockDatasetIsEmpty = Boolean(data && dedupedStocks.length === 0);

    const openDetail = (type: MarketTab, code: string) =>
        navigate(`/portfolio/${type}/${encodeURIComponent(code)}`);

    const handleTabChange = (_: unknown, nextTab: MarketTab | null) => {
        if (!nextTab) return;
        setActiveTab(nextTab);
        setQuery("");
    };

    return {
        data, loading, error, lastSyncedAt, reload,
        sortState, toggleSort,
        activeTab, handleTabChange,
        query, setQuery,
        activeMeta,
        isInitialLoading, isRefreshing,
        fxRows, bondRows, fundRows, stockRows,
        summaryCards, activeDatasetDate,
        visibleCount, totalCount,
        stockDatasetIsEmpty,
        openDetail,
    };
}