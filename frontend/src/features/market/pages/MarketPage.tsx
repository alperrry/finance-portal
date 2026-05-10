import { useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Skeleton, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { KapitalShell } from "../../../components/layout";
import { PageHeader, SectionPanel } from "../../../components/ui";
import { useMarketData } from "../hooks/useMarketData";
import { useMarketSort } from "../hooks/useMarketSort";
import { sortFxRows, sortBondRows, sortFundRows, sortStockRows, getSummaryCards, getLatestDatasetDate, matchesSearch, dedupeStocksByLatestSnapshot } from "../utils/marketSorters";
import { formatLocalDateTime } from "../utils/marketFormatters";
import { MARKET_TABS } from "../types";
import type { MarketTab } from "../types";
import { MarketSummaryCards } from "../components/MarketSummaryCards";
import { MarketSearchBar } from "../components/MarketSearchBar";
import { FxTable } from "../components/FxTable";
import { BondsTable } from "../components/BondsTable";
import { FundsTable } from "../components/FundsTable";
import { StocksTable } from "../components/StocksTable";
export default function MarketPage() {
    const navigate = useNavigate();
    const { data, loading, error, lastSyncedAt, reload } = useMarketData();
    const { sortState, toggleSort } = useMarketSort();
    const [activeTab, setActiveTab] = useState<MarketTab>("fx");
    const [query, setQuery] = useState("");

    const activeMeta = MARKET_TABS.find((tab) => tab.key === activeTab) ?? MARKET_TABS[0];
    const isInitialLoading = loading && data === null;
    const isRefreshing = loading && data !== null;

    const dedupedStocks = useMemo(() => (data ? dedupeStocksByLatestSnapshot(data.stocks) : []), [data]);

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
    const activeDatasetDate = useMemo(() => (data ? getLatestDatasetDate(activeTab, data) : "-"), [activeTab, data]);

    const visibleCount = activeTab === "fx" ? fxRows.length : activeTab === "bonds" ? bondRows.length : activeTab === "funds" ? fundRows.length : stockRows.length;
    const totalCount = data ? (activeTab === "stocks" ? dedupedStocks.length : data[activeTab].length) : 0;
    const stockDatasetIsEmpty = Boolean(data && dedupedStocks.length === 0);

    const openDetail = (type: MarketTab, code: string) => navigate(`/portfolio/${type}/${encodeURIComponent(code)}`);

    return (
        <KapitalShell activePage="portfolio" showCategories={false}>
            <Box sx={{ minHeight: "100%" }}>
                <Stack sx={{ gap: 2.25, width: "min(1280px, calc(100% - 40px))", mx: "auto" }}>
                    <SectionPanel
                        component="section"
                        sx={{
                            background:
                                "radial-gradient(circle at top left, rgba(193, 98, 47, 0.12), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(247, 245, 241, 0.9))",
                        }}
                    >
                        <PageHeader
                            kicker="Canlı Piyasa Terminali"
                            title="Enstrümanlar"
                            subtitle={activeMeta.description}
                            actions={
                                <>
                                    <Chip
                                        variant="outlined"
                                        label={`Son senkron: ${lastSyncedAt ? formatLocalDateTime(lastSyncedAt) : "Bekleniyor"}`}
                                    />
                                    <Button variant="contained" color="secondary" type="button" disabled={loading} onClick={reload}>
                                        {isRefreshing || isInitialLoading ? "Yenileniyor..." : "Verileri Yenile"}
                                    </Button>
                                </>
                            }
                        />

                        <ToggleButtonGroup
                            exclusive
                            value={activeTab}
                            onChange={(_, nextTab: MarketTab | null) => {
                                if (!nextTab) return;
                                setActiveTab(nextTab);
                                setQuery("");
                            }}
                            aria-label="Enstrüman kategorileri"
                            sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}
                        >
                            {MARKET_TABS.map((tab) => (
                                <ToggleButton key={tab.key} value={tab.key} size="small" aria-label={tab.label}>
                                    {tab.label}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </SectionPanel>

                    {error ? (
                        <Alert severity="error" action={<Button color="inherit" size="small" type="button" onClick={reload}>Tekrar dene</Button>}>
                            <strong>Veri akışı kesildi.</strong> {error}
                        </Alert>
                    ) : null}

                    {isInitialLoading ? (
                        <>
                            <MarketSummaryCards summaryCards={[]} loading={true} />
                            <SectionPanel component="section">
                                <PageHeader kicker="Yükleniyor" title="Piyasa verileri hazırlanıyor" />
                                <Stack sx={{ mt: 2, gap: 1 }}>
                                    {Array.from({ length: 7 }).map((_, index) => (
                                        <Skeleton key={`row-skeleton-${index}`} height={34} />
                                    ))}
                                </Stack>
                            </SectionPanel>
                        </>
                    ) : null}

                    {data ? (
                        <>
                            <MarketSummaryCards summaryCards={summaryCards} loading={false} />

                            <SectionPanel component="section">
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "flex-end" }, gap: 2 }}
                                >
                                    <PageHeader title={activeMeta.label} subtitle={activeMeta.description} />
                                    <MarketSearchBar
                                        query={query}
                                        onQueryChange={setQuery}
                                        placeholder={activeMeta.searchPlaceholder}
                                        visibleCount={visibleCount}
                                        totalCount={totalCount}
                                        datasetDate={activeDatasetDate}
                                    />
                                </Stack>

                                {activeTab === "fx" && (
                                    <FxTable
                                        rows={fxRows}
                                        sortConfig={sortState.fx}
                                        onSort={(key) => toggleSort("fx", key)}
                                        onRowClick={(code) => openDetail("fx", code)}
                                    />
                                )}
                                {activeTab === "bonds" && (
                                    <BondsTable
                                        rows={bondRows}
                                        sortConfig={sortState.bonds}
                                        onSort={(key) => toggleSort("bonds", key)}
                                        onRowClick={(code) => openDetail("bonds", code)}
                                    />
                                )}
                                {activeTab === "funds" && (
                                    <FundsTable
                                        rows={fundRows}
                                        sortConfig={sortState.funds}
                                        onSort={(key) => toggleSort("funds", key)}
                                        onRowClick={(code) => openDetail("funds", code)}
                                    />
                                )}
                                {activeTab === "stocks" && (
                                    <StocksTable
                                        rows={stockRows}
                                        stockDatasetIsEmpty={stockDatasetIsEmpty}
                                        sortConfig={sortState.stocks}
                                        onSort={(key) => toggleSort("stocks", key)}
                                        onRowClick={(symbol) => openDetail("stocks", symbol)}
                                    />
                                )}
                            </SectionPanel>
                        </>
                    ) : null}
                </Stack>
            </Box>
        </KapitalShell>
    );
}
