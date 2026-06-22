import { Alert, Button, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import type { PortfolioDetailPageState } from "../hooks/usePortfolioDetailPage";
import { PortfolioMetrics } from "./PortfolioMetrics";
import { PortfolioTypeChart } from "./PortfolioTypeChart";
import { PositionsByTypeTable } from "./PositionsByTypeTable";

interface PortfolioDetailContentProps {
    page: PortfolioDetailPageState;
}

export function PortfolioDetailContent({ page }: PortfolioDetailContentProps) {
    const { t } = useTranslation();
    const { portfolio, detailState, openPositions, closedPositions, positionsLoading, positionsError, positionKindTab, handlers } = page;

    const activePositions = positionKindTab === "OPEN" ? openPositions : closedPositions;

    return (
        <>
            {detailState.loading ? (
                <Stack sx={{ alignItems: "center", py: 4, gap: 1 }}>
                    <CircularProgress size={28} />
                    <Typography variant="body2" color="text.secondary">{t("portfolio.detail.loading")}</Typography>
                </Stack>
            ) : null}

            {!detailState.loading && detailState.error ? (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    action={<Button size="small" color="inherit" onClick={handlers.retryDetail}>{t("common.retry")}</Button>}
                >
                    {detailState.error}
                </Alert>
            ) : null}

            {portfolio ? (
                <Stack sx={{ gap: 3 }}>
                    <PortfolioMetrics portfolio={portfolio} closedPositions={closedPositions} />

                    <SectionPanel>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("portfolio.detail.trackedPositions")}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{t("portfolio.detail.distribution")}</Typography>
                        <PortfolioTypeChart positions={openPositions} currency={portfolio.displayCurrency} onNewTrade={handlers.openTradeModal} />
                    </SectionPanel>

                    <SectionPanel>
                        {positionsError ? (
                            <Alert
                                severity="error"
                                sx={{ mb: 2 }}
                                action={<Button size="small" color="inherit" onClick={handlers.retryPositions}>{t("common.retry")}</Button>}
                            >
                                {positionsError}
                            </Alert>
                        ) : (
                            <PositionsByTypeTable
                                portfolioId={portfolio.id}
                                positions={activePositions}
                                loading={positionsLoading}
                                kind={positionKindTab}
                                onKindChange={handlers.setPositionKindTab}
                                onDelete={handlers.handlePositionDelete}
                                onSell={handlers.handleSellOpen}
                                onSimulate={handlers.handleManualPositionSimulation}
                            />
                        )}
                    </SectionPanel>

                    <SectionPanel sx={{ borderColor: "error.light", border: "1px solid" }}>
                        <Typography variant="overline" color="error" sx={{ fontWeight: 800 }}>{t("portfolio.detail.dangerZone")}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                {t("portfolio.detail.dangerZoneDesc")}
                            </Typography>
                            <Button variant="outlined" color="error" onClick={() => handlers.openDelete(portfolio)} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                                {t("portfolio.detail.deleteButton")}
                            </Button>
                        </Stack>
                    </SectionPanel>
                </Stack>
            ) : null}
        </>
    );
}
