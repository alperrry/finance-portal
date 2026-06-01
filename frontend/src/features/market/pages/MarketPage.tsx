import { Alert, Box, Button, Chip, Skeleton, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTranslation } from "react-i18next";
import { KapitalShell } from "../../../components/layout";
import { PageHeader, SectionPanel } from "../../../components/ui";
import { formatLocalDateTime } from "../utils/marketFormatters";
import { MARKET_TABS, TAB_I18N_KEY } from "../types";
import { MarketSummaryCards } from "../components/MarketSummaryCards";
import { MarketSearchBar } from "../components/MarketSearchBar";
import { FxTable } from "../components/FxTable";
import { CurrencyConverterCard } from "../components/CurrencyConverterCard";
import { BondsTable } from "../components/BondsTable";
import { FundsTable } from "../components/FundsTable";
import { StocksTable } from "../components/StocksTable";
import { MacroTable } from "../components/MacroTable";
import { ViopTable } from "../components/ViopTable";
import { useMarketPage } from "../hooks/useMarketPage";

export default function MarketPage() {
    const { t } = useTranslation();
    const {
        data, loading, error, lastSyncedAt, reload,
        sortState, toggleSort,
        activeTab, handleTabChange,
        query, setQuery,
        isInitialLoading, isRefreshing,
        fxRows, bondRows, fundRows, stockRows, indexRows, commodityRows, cryptoRows, macroRows, viopRows,
        summaryCards, activeDatasetDate,
        visibleCount, totalCount,
        instrumentDatasetIsEmpty,
        openDetail,
        stockIndexFilter, setStockIndexFilter,
    } = useMarketPage();

    const activeI18nKey = TAB_I18N_KEY[activeTab];
    const activeLabel = t(`market.tabs.${activeI18nKey}.label` as any) as string;
    const activeDescription = t(`market.tabs.${activeI18nKey}.description` as any) as string;
    const activePlaceholder = t(`market.tabs.${activeI18nKey}.placeholder` as any) as string;

    return (
        <KapitalShell activePage="portfolio" showCategories={false}>
            <Box sx={{ minHeight: "100%" }}>
                <Stack sx={{ gap: 2.25, width: "min(1280px, calc(100% - 40px))", mx: "auto" }}>
                    <SectionPanel
                        component="section"
                        sx={{
                            background: (theme) => theme.palette.mode === "dark"
                                ? "radial-gradient(circle at top left, rgba(193, 98, 47, 0.12), transparent 34%), linear-gradient(145deg, rgba(33, 28, 24, 0.92), rgba(24, 21, 18, 0.9))"
                                : "radial-gradient(circle at top left, rgba(193, 98, 47, 0.12), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(247, 245, 241, 0.9))",
                        }}
                    >
                        <PageHeader
                            kicker={t("market.page.kicker")}
                            title={t("market.page.title")}
                            subtitle={activeDescription}
                            actions={
                                <>
                                    <Chip
                                        variant="outlined"
                                        label={`${t("market.page.lastSync")} ${lastSyncedAt ? formatLocalDateTime(lastSyncedAt) : t("market.page.waiting")}`}
                                    />
                                    <Button variant="contained" color="secondary" type="button" disabled={loading} onClick={reload}>
                                        {isRefreshing || isInitialLoading ? t("market.page.refreshing") : t("market.page.refresh")}
                                    </Button>
                                </>
                            }
                        />
                        <ToggleButtonGroup
                            exclusive
                            value={activeTab}
                            onChange={handleTabChange}
                            aria-label={t("market.page.tabsAriaLabel")}
                            sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}
                        >
                            {MARKET_TABS.map((tab) => {
                                const label = t(`market.tabs.${TAB_I18N_KEY[tab.key]}.label` as any) as string;
                                return (
                                    <ToggleButton key={tab.key} value={tab.key} size="small" aria-label={label}>
                                        {label}
                                    </ToggleButton>
                                );
                            })}
                        </ToggleButtonGroup>
                    </SectionPanel>

                    {error && (
                        <Alert severity="error" action={<Button color="inherit" size="small" type="button" onClick={reload}>{t("common.retry")}</Button>}>
                            <strong>{t("market.page.connectionLost")}</strong> {error}
                        </Alert>
                    )}

                    {isInitialLoading && (
                        <>
                            <MarketSummaryCards summaryCards={[]} loading={true} />
                            <SectionPanel component="section">
                                <PageHeader kicker={t("market.page.loading.kicker")} title={t("market.page.loading.title")} />
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
                                    <PageHeader title={activeLabel} subtitle={activeDescription} />
                                    <MarketSearchBar
                                        query={query}
                                        onQueryChange={setQuery}
                                        placeholder={activePlaceholder}
                                        visibleCount={visibleCount}
                                        totalCount={totalCount}
                                        datasetDate={activeDatasetDate}
                                    />
                                </Stack>

                                {activeTab === "stocks" && (
                                    <Stack direction="row" sx={{ mt: 1.5, gap: 1 }}>
                                        {(["ALL", "BIST30", "BIST100"] as const).map((filter) => (
                                            <Chip
                                                key={filter}
                                                label={filter === "ALL" ? t("market.page.all") : filter}
                                                size="small"
                                                variant={stockIndexFilter === filter ? "filled" : "outlined"}
                                                color={stockIndexFilter === filter ? "primary" : "default"}
                                                onClick={() => setStockIndexFilter(filter)}
                                                sx={{ cursor: "pointer" }}
                                            />
                                        ))}
                                    </Stack>
                                )}

                                {activeTab === "fx" && (
                                    <>
                                        <FxTable
                                            rows={fxRows}
                                            sortConfig={sortState.fx}
                                            onSort={(key) => toggleSort("fx", key)}
                                            onRowClick={(code) => openDetail("fx", code)}
                                        />
                                        <Box sx={{ mt: 2 }}>
                                            <CurrencyConverterCard fxRows={fxRows} />
                                        </Box>
                                    </>
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
                                        stockDatasetIsEmpty={instrumentDatasetIsEmpty}
                                        sortConfig={sortState.stocks}
                                        onSort={(key) => toggleSort("stocks", key)}
                                        onRowClick={(symbol) => openDetail("stocks", symbol)}
                                    />
                                )}
                                {activeTab === "indexes" && (
                                    <StocksTable
                                        rows={indexRows}
                                        stockDatasetIsEmpty={instrumentDatasetIsEmpty}
                                        sortConfig={sortState.indexes}
                                        onSort={(key) => toggleSort("indexes", key)}
                                        onRowClick={(symbol) => openDetail("indexes", symbol)}
                                    />
                                )}
                                {activeTab === "commodities" && (
                                    <StocksTable
                                        rows={commodityRows}
                                        stockDatasetIsEmpty={instrumentDatasetIsEmpty}
                                        sortConfig={sortState.commodities}
                                        onSort={(key) => toggleSort("commodities", key)}
                                        onRowClick={(symbol) => openDetail("commodities", symbol)}
                                    />
                                )}
                                {activeTab === "crypto" && (
                                    <StocksTable
                                        rows={cryptoRows}
                                        stockDatasetIsEmpty={instrumentDatasetIsEmpty}
                                        sortConfig={sortState.crypto}
                                        onSort={(key) => toggleSort("crypto", key)}
                                        onRowClick={(symbol) => openDetail("crypto", symbol)}
                                    />
                                )}
                                {activeTab === "macro" && (
                                    <MacroTable
                                        rows={macroRows}
                                        sortConfig={sortState.macro}
                                        onSort={(key) => toggleSort("macro", key)}
                                    />
                                )}
                                {activeTab === "viop" && (
                                    <ViopTable
                                        rows={viopRows}
                                        sortConfig={sortState.viop}
                                        onSort={(key) => toggleSort("viop", key)}
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
