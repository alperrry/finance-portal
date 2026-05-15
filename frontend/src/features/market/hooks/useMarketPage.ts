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
    sortMacroRows,
    sortStockRows,
    sortViopRows,
} from "../utils/marketSorters";
import { MARKET_TABS } from "../types";
import type { MarketTab } from "../types";

export function useMarketPage() {
    const navigate = useNavigate();
    const { data, loading, error, lastSyncedAt, reload } = useMarketData();
    const { sortState, toggleSort } = useMarketSort();
    const [activeTab, setActiveTab] = useState<MarketTab>("fx");
    const [query, setQuery] = useState("");
    const [stockIndexFilter, setStockIndexFilter] = useState<"ALL" | "BIST30" | "BIST100">("ALL");

    const activeMeta = MARKET_TABS.find((tab) => tab.key === activeTab) ?? MARKET_TABS[0];
    const isInitialLoading = loading && data === null;
    const isRefreshing = loading && data !== null;

    const dedupedStocks = useMemo(
        () => (data ? dedupeStocksByLatestSnapshot(data.stocks) : []),
        [data],
    );
    const dedupedIndexes = useMemo(
        () => (data ? dedupeStocksByLatestSnapshot(data.indexes) : []),
        [data],
    );
    const dedupedCommodities = useMemo(
        () => (data ? dedupeStocksByLatestSnapshot(data.commodities) : []),
        [data],
    );
    const dedupedCrypto = useMemo(
        () => (data ? dedupeStocksByLatestSnapshot(data.crypto) : []),
        [data],
    );

    const stockIndexFiltered = useMemo(() => {
        if (stockIndexFilter === "ALL") return dedupedStocks;
        if (stockIndexFilter === "BIST30") return dedupedStocks.filter((r) => r.indexName === "BIST30");
        return dedupedStocks.filter((r) => r.indexName === "BIST30" || r.indexName === "BIST100");
    }, [dedupedStocks, stockIndexFilter]);

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
        () => data ? sortStockRows(stockIndexFiltered.filter((r) => matchesSearch(query, r.symbol, r.shortName, r.longName, r.sector, r.indexName)), sortState.stocks) : [],
        [data, stockIndexFiltered, query, sortState.stocks],
    );
    const indexRows = useMemo(
        () => data ? sortStockRows(dedupedIndexes.filter((r) => matchesSearch(query, r.symbol, r.shortName, r.longName, r.indexName)), sortState.indexes) : [],
        [data, dedupedIndexes, query, sortState.indexes],
    );
    const commodityRows = useMemo(
        () => data ? sortStockRows(dedupedCommodities.filter((r) => matchesSearch(query, r.symbol, r.shortName, r.longName, r.indexName)), sortState.commodities) : [],
        [data, dedupedCommodities, query, sortState.commodities],
    );
    const cryptoRows = useMemo(
        () => data ? sortStockRows(dedupedCrypto.filter((r) => matchesSearch(query, r.symbol, r.shortName, r.longName, r.indexName)), sortState.crypto) : [],
        [data, dedupedCrypto, query, sortState.crypto],
    );
    const macroRows = useMemo(
        () => data
            ? sortMacroRows(
                  [...data.macroInflation, ...data.macroDepositRates].filter((r) =>
                      matchesSearch(query, r.seriesCode, r.name, r.dataType, r.unit),
                  ),
                  sortState.macro,
              )
            : [],
        [data, query, sortState.macro],
    );
    const viopRows = useMemo(
        () => data
            ? sortViopRows(
                  data.viop.filter((r) =>
                      matchesSearch(query, r.contractName, r.marketSegment, r.underlyingSymbol, r.maturityText),
                  ),
                  sortState.viop,
              )
            : [],
        [data, query, sortState.viop],
    );

    const summaryCards = useMemo(
        () => data ? getSummaryCards(activeTab, {
            ...data,
            stocks: dedupedStocks,
            indexes: dedupedIndexes,
            commodities: dedupedCommodities,
            crypto: dedupedCrypto,
        }) : [],
        [activeTab, data, dedupedStocks, dedupedIndexes, dedupedCommodities, dedupedCrypto],
    );
    const activeDatasetDate = useMemo(
        () => (data ? getLatestDatasetDate(activeTab, data) : "-"),
        [activeTab, data],
    );

    const visibleCount =
        activeTab === "fx" ? fxRows.length
            : activeTab === "bonds" ? bondRows.length
                : activeTab === "funds" ? fundRows.length
                    : activeTab === "stocks" ? stockRows.length
                        : activeTab === "indexes" ? indexRows.length
                            : activeTab === "commodities" ? commodityRows.length
                                : activeTab === "crypto" ? cryptoRows.length
                                    : activeTab === "macro" ? macroRows.length
                                        : viopRows.length;

    const totalCount = data
        ? (activeTab === "stocks"
            ? stockIndexFiltered.length
            : activeTab === "indexes"
                ? dedupedIndexes.length
            : activeTab === "commodities"
                ? dedupedCommodities.length
            : activeTab === "crypto"
                ? dedupedCrypto.length
            : activeTab === "macro"
                ? data.macroInflation.length + data.macroDepositRates.length
                : data[activeTab].length)
        : 0;

    const instrumentDatasetIsEmpty = Boolean(data && (
        activeTab === "stocks" ? stockIndexFiltered.length === 0
            : activeTab === "indexes" ? dedupedIndexes.length === 0
                : activeTab === "commodities" ? dedupedCommodities.length === 0
                    : activeTab === "crypto" ? dedupedCrypto.length === 0
                        : false
    ));

    const openDetail = (type: Exclude<MarketTab, "macro" | "viop">, code: string) =>
        navigate(`/portfolio/${type}/${encodeURIComponent(code)}`);

    const handleTabChange = (_: unknown, nextTab: MarketTab | null) => {
        if (!nextTab) return;
        setActiveTab(nextTab);
        setQuery("");
        setStockIndexFilter("ALL");
    };

    return {
        data, loading, error, lastSyncedAt, reload,
        sortState, toggleSort,
        activeTab, handleTabChange,
        query, setQuery,
        activeMeta,
        isInitialLoading, isRefreshing,
        fxRows, bondRows, fundRows, stockRows, indexRows, commodityRows, cryptoRows, macroRows, viopRows,
        summaryCards, activeDatasetDate,
        visibleCount, totalCount,
        instrumentDatasetIsEmpty,
        openDetail,
        stockIndexFilter, setStockIndexFilter,
    };
}
