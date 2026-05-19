import { Alert, Button, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import type { PortfolioDetailPageState } from "../hooks/usePortfolioDetailPage";
import { PortfolioAllocationChart } from "./PortfolioAllocationChart";
import { PortfolioMetrics } from "./PortfolioMetrics";
import { PortfolioTypeChart } from "./PortfolioTypeChart";
import { PositionsByTypeTable } from "./PositionsByTypeTable";
import { PositionsTable } from "./PositionsTable";

interface PortfolioDetailContentProps {
    page: PortfolioDetailPageState;
}

export function PortfolioDetailContent({ page }: PortfolioDetailContentProps) {
    const { portfolio, detailState, openPositions, closedPositions, positionsLoading, positionsError, positionKindTab, handlers } = page;

    const activePositions = positionKindTab === "OPEN" ? openPositions : closedPositions;
    const hasTrackedItems = (portfolio?.items?.length ?? 0) > 0;

    return (
        <>
            {detailState.loading ? (
                <Stack sx={{ alignItems: "center", py: 4, gap: 1 }}>
                    <CircularProgress size={28} />
                    <Typography variant="body2" color="text.secondary">Portföy detayı yükleniyor...</Typography>
                </Stack>
            ) : null}

            {!detailState.loading && detailState.error ? (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    action={<Button size="small" color="inherit" onClick={handlers.retryDetail}>Tekrar dene</Button>}
                >
                    {detailState.error}
                </Alert>
            ) : null}

            {portfolio ? (
                <Stack sx={{ gap: 3 }}>
                    <PortfolioMetrics portfolio={portfolio} />

                    {hasTrackedItems && (
                        <SectionPanel>
                            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Takip Edilen Pozisyonlar</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Portföy Dağılımı</Typography>
                            <PortfolioAllocationChart items={portfolio.items} displayCurrency={portfolio.displayCurrency} />
                            <Divider sx={{ my: 2 }} />
                            <PositionsTable items={portfolio.items} displayCurrency={portfolio.displayCurrency} />
                        </SectionPanel>
                    )}

                    <SectionPanel>
                        <PortfolioTypeChart positions={openPositions} currency={portfolio.displayCurrency} onNewTrade={handlers.openTradeModal} />
                    </SectionPanel>

                    <SectionPanel>
                        {positionsError ? (
                            <Alert
                                severity="error"
                                sx={{ mb: 2 }}
                                action={<Button size="small" color="inherit" onClick={handlers.retryPositions}>Tekrar dene</Button>}
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
                            />
                        )}
                    </SectionPanel>

                    <SectionPanel sx={{ borderColor: "error.light", border: "1px solid" }}>
                        <Typography variant="overline" color="error" sx={{ fontWeight: 800 }}>Tehlikeli Bölge</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Bu işlem geri alınamaz. Portföy ve tüm ilgili kayıtlar kalıcı olarak silinir.
                            </Typography>
                            <Button variant="outlined" color="error" onClick={() => handlers.openDelete(portfolio)} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                                Portföyü Sil
                            </Button>
                        </Stack>
                    </SectionPanel>
                </Stack>
            ) : null}
        </>
    );
}
