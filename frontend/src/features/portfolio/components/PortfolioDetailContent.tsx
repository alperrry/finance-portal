import { Alert, Button, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import type { PortfolioDetailPageState } from "../hooks/usePortfolioDetailPage";
import { PortfolioAllocationChart } from "./PortfolioAllocationChart";
import { PortfolioMetrics } from "./PortfolioMetrics";
import { PositionsTable } from "./PositionsTable";
import { TradeHistoryTable } from "./TradeHistoryTable";

interface PortfolioDetailContentProps {
    page: PortfolioDetailPageState;
}

export function PortfolioDetailContent({ page }: PortfolioDetailContentProps) {
    const { portfolio, detailState, tradeHistoryState, tradeStatus, tradeFilters, pending, handlers } = page;

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
                    <SectionPanel>
                        <PortfolioMetrics portfolio={portfolio} />
                    </SectionPanel>

                    <SectionPanel>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy Dağılımı</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Dağılım Grafiği</Typography>
                        <PortfolioAllocationChart portfolio={portfolio} onNewTrade={handlers.openTradeModal} />
                    </SectionPanel>

                    <SectionPanel>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Açık Pozisyonlar</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Pozisyonlar</Typography>
                        <PositionsTable items={portfolio.items ?? []} displayCurrency={portfolio.displayCurrency} />
                    </SectionPanel>

                    <SectionPanel>
                        <TradeHistoryTable
                            state={tradeHistoryState}
                            status={tradeStatus}
                            filters={tradeFilters}
                            displayCurrency={portfolio.displayCurrency}
                            onStatusChange={handlers.setTradeStatus}
                            onFiltersChange={handlers.setTradeFilters}
                            onPageChange={handlers.setTradePage}
                            onCancel={handlers.handleCancelTrade}
                            onExportPdf={handlers.handleExportPdf}
                            cancelingTradeId={pending.cancelingTradeId}
                            exportBusy={pending.exportBusy}
                            canExport={Boolean(portfolio)}
                        />
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
