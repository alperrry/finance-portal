import { Alert, Box, Button, Chip, Skeleton, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { KapitalShell } from "../../../components/layout";
import { PageHeader, SectionPanel } from "../../../components/ui";
import { formatLocalDateTime } from "../utils/marketFormatters";
import { MARKET_TABS } from "../types";
import { MarketSummaryCards } from "../components/MarketSummaryCards";
import { MarketSearchBar } from "../components/MarketSearchBar";
import { FxTable } from "../components/FxTable";
import { BondsTable } from "../components/BondsTable";
import { FundsTable } from "../components/FundsTable";
import { StocksTable } from "../components/StocksTable";
import { useMarketPage } from "../hooks/useMarketPage";

export default function MarketPage() {
    const {
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
    } = useMarketPage();

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
                            onChange={handleTabChange}
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

                    {error && (
                        <Alert severity="error" action={<Button color="inherit" size="small" type="button" onClick={reload}>Tekrar dene</Button>}>
                            <strong>Veri akışı kesildi.</strong> {error}
                        </Alert>
                    )}

                    {isInitialLoading && (
                        <>
                            <MarketSummaryCards summaryCards={[]} loading={true} />
                            <SectionPanel component="section">
                                <PageHeader kicker="Yükleniyor" title="Piyasa verileri hazırlanıyor" />
                                <Stack sx={{ mt: 2, gap: 1 }}>
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <Skeleton key={i} height={34} />
                                    ))}
                                </Stack>
                            </SectionPanel>
                        </>
                    )}

                    {data && (
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
                    )}
                </Stack>
            </Box>
        </KapitalShell>
    );
}