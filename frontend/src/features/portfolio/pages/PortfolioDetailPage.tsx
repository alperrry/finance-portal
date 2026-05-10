import { Alert, Box, Button, Chip, CircularProgress, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../../services/api/client";
import {
    cancelTrade,
    deletePortfolio,
    fetchPortfolio,
    fetchPortfolioTrades,
    submitTrade,
    updatePortfolio,
    type CreatePortfolioRequest,
    type PortfolioResponse,
    type TradeRequest,
    type TradeResponse,
    type TransactionStatus,
} from "../api/portfolioApi";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import { KapitalShell } from "../../../components/layout";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { useTradeNotifications } from "../../../hooks/useTradeNotifications";
import { websocketClient } from "../../../services/websocketClient";
import { exportPortfolioPdf } from "../../../utils/portfolioPdfExport";
import { DeletePortfolioModal } from "../components/DeletePortfolioModal";
import { NewTradeModal } from "../components/NewTradeModal";
import { PortfolioAllocationChart } from "../components/PortfolioAllocationChart";
import { PortfolioFormModal } from "../components/PortfolioFormModal";
import { PortfolioMetrics } from "../components/PortfolioMetrics";
import { PositionsTable } from "../components/PositionsTable";
import { TradeHistoryTable } from "../components/TradeHistoryTable";
import { INSTRUMENT_LABELS, TRADE_EXPORT_PAGE_SIZE, TRADE_PAGE_SIZE } from "../types";
import type { DetailState, PortfolioFormState, TradeFilters, TradeHistoryState } from "../types";
import { filterTrades, resolveApiError } from "../utils/portfolioFormatters";

export function PortfolioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token, currentUser, refreshCurrentUser } = useAuth();
    const { showToast } = useToast();
    const portfolioId = Number(id);
    const validPortfolioId = Number.isFinite(portfolioId) && portfolioId > 0 ? portfolioId : null;

    const [detailReloadToken, setDetailReloadToken] = useState(0);
    const [detailState, setDetailState] = useState<DetailState>({ loading: false, error: null, data: null });
    const [tradeHistoryState, setTradeHistoryState] = useState<TradeHistoryState>({ loading: false, error: null, page: null });
    const [tradeStatus, setTradeStatus] = useState<TransactionStatus | "">("");
    const [tradeFilters, setTradeFilters] = useState<TradeFilters>({ from: "", to: "", instrument: "", type: "", query: "" });
    const [tradePage, setTradePage] = useState(0);
    const [tradeReloadToken, setTradeReloadToken] = useState(0);
    const [formState, setFormState] = useState<PortfolioFormState | null>(null);
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PortfolioResponse | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [tradeModalOpen, setTradeModalOpen] = useState(false);
    const [tradeBusy, setTradeBusy] = useState(false);
    const [tradeError, setTradeError] = useState<string | null>(null);
    const [cancelingTradeId, setCancelingTradeId] = useState<number | null>(null);
    const [exportBusy, setExportBusy] = useState(false);

    useEffect(() => {
        if (!validPortfolioId) {
            setDetailState({ loading: false, error: "Geçersiz portföy ID.", data: null });
            return undefined;
        }
        let active = true;
        setDetailState((current) => ({ ...current, loading: true, error: null }));
        fetchPortfolio(validPortfolioId)
            .then((data) => { if (active) setDetailState({ loading: false, error: null, data }); })
            .catch((caughtError) => {
                if (active) setDetailState({ loading: false, error: resolveApiError(caughtError, "Portföy detayı yüklenemedi."), data: null });
            });
        return () => { active = false; };
    }, [detailReloadToken, validPortfolioId]);

    useEffect(() => {
        if (!validPortfolioId) { setTradeHistoryState({ loading: false, error: null, page: null }); return undefined; }
        let active = true;
        setTradeHistoryState((current) => ({ ...current, loading: true, error: null }));
        fetchPortfolioTrades(validPortfolioId, { status: tradeStatus, page: tradePage, size: TRADE_PAGE_SIZE })
            .then((page) => { if (active) setTradeHistoryState({ loading: false, error: null, page }); })
            .catch((caughtError) => {
                if (active) setTradeHistoryState({ loading: false, error: resolveApiError(caughtError, "İşlem geçmişi yüklenemedi."), page: null });
            });
        return () => { active = false; };
    }, [tradePage, tradeReloadToken, tradeStatus, validPortfolioId]);

    const refreshPortfolio = useCallback((changedPortfolioId?: number) => {
        if (!validPortfolioId || (changedPortfolioId && changedPortfolioId !== validPortfolioId)) return;
        setDetailReloadToken((value) => value + 1);
        setTradeReloadToken((value) => value + 1);
    }, [validPortfolioId]);

    const resolveTradeLabel = useCallback((trade: TradeResponse) => {
        const item = detailState.data?.items.find(
            (portfolioItem) => portfolioItem.instrumentType === trade.instrumentType && portfolioItem.instrumentId === trade.instrumentId,
        );
        return trade.instrumentSymbol || item?.instrumentSymbol || `${INSTRUMENT_LABELS[trade.instrumentType]} #${trade.instrumentId}`;
    }, [detailState.data?.items]);

    useTradeNotifications({ token, activePortfolioId: validPortfolioId, onPortfolioSignal: refreshPortfolio, onBalanceSignal: refreshCurrentUser, resolveTradeLabel });

    useEffect(() => {
        if (!validPortfolioId || !token) return undefined;
        const intervalId = setInterval(() => {
            if (!websocketClient.isConnected()) refreshPortfolio(validPortfolioId);
        }, 60000);
        return () => clearInterval(intervalId);
    }, [validPortfolioId, token, refreshPortfolio]);

    const submitPortfolioForm = async (payload: CreatePortfolioRequest) => {
        if (!formState?.portfolio) return;
        setFormBusy(true);
        setFormError(null);
        try {
            await updatePortfolio(formState.portfolio.id, { name: payload.name });
            showToast("Portföy güncellendi.", "success");
            setFormState(null);
            refreshPortfolio(formState.portfolio.id);
        } catch (caughtError) {
            setFormError(resolveApiError(caughtError, "Portföy kaydedilemedi."));
        } finally {
            setFormBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        setDeleteError(null);
        try {
            await deletePortfolio(deleteTarget.id);
            showToast("Portföy silindi.", "success");
            setDeleteTarget(null);
            navigate("/portfolios");
        } catch (caughtError) {
            const message =
                caughtError instanceof ApiError && caughtError.status === 409
                    ? "Bu portföyde pozisyon veya bekleyen emir var. Önce pozisyonları kapatman ve bekleyen emirleri iptal etmen gerekir."
                    : resolveApiError(caughtError, "Portföy silinemedi.");
            setDeleteError(message);
        } finally {
            setDeleteBusy(false);
        }
    };

    const submitNewTrade = async (payload: TradeRequest) => {
        if (!validPortfolioId) return;
        setTradeBusy(true);
        setTradeError(null);
        try {
            const response = await submitTrade(validPortfolioId, payload);
            setTradeModalOpen(false);
            showToast(
                response.status === "APPROVED"
                    ? "İşlem onaylandı."
                    : "İşlem talebi alındı. Hedef fiyata ulaşıldığında gerçekleşecek.",
                "success",
            );
            void refreshCurrentUser();
            refreshPortfolio(validPortfolioId);
        } catch (caughtError) {
            setTradeError(resolveApiError(caughtError, "İşlem talebi gönderilemedi."));
        } finally {
            setTradeBusy(false);
        }
    };

    const handleCancelTrade = async (trade: TradeResponse) => {
        if (!validPortfolioId) return;
        setCancelingTradeId(trade.id);
        try {
            await cancelTrade(validPortfolioId, trade.id);
            showToast("İşlem iptal edildi.", "info");
            void refreshCurrentUser();
            refreshPortfolio(validPortfolioId);
        } catch (caughtError) {
            showToast(resolveApiError(caughtError, "İşlem iptal edilemedi."), "error");
        } finally {
            setCancelingTradeId(null);
        }
    };

    const handleExportPdf = async () => {
        if (!detailState.data || !validPortfolioId) return;
        setExportBusy(true);
        try {
            const firstPage = await fetchPortfolioTrades(validPortfolioId, { status: tradeStatus, page: 0, size: TRADE_EXPORT_PAGE_SIZE });
            const allTrades = [...firstPage.content];
            for (let page = 1; page < firstPage.totalPages; page += 1) {
                const nextPage = await fetchPortfolioTrades(validPortfolioId, { status: tradeStatus, page, size: TRADE_EXPORT_PAGE_SIZE });
                allTrades.push(...nextPage.content);
            }
            await exportPortfolioPdf({ portfolio: detailState.data, trades: filterTrades(allTrades, tradeFilters), filters: tradeFilters });
        } catch (caughtError) {
            showToast(resolveApiError(caughtError, "PDF raporu oluşturulamadı."), "error");
        } finally {
            setExportBusy(false);
        }
    };

    const portfolio = detailState.data;

    return (
        <KapitalShell activePage="portfolios" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Button
                    variant="text"
                    size="small"
                    onClick={() => navigate("/portfolios")}
                    sx={{ mb: 2, color: "text.secondary" }}
                >
                    ← Portföylere dön
                </Button>

                <SectionPanel sx={{ mb: 3 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                        <Box>
                            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy Detayı</Typography>
                            <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                {detailState.loading ? (
                                    <Skeleton variant="text" width={200} sx={{ fontSize: "2rem" }} />
                                ) : (
                                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                                        {portfolio?.name ?? "—"}
                                    </Typography>
                                )}
                                {portfolio ? (
                                    <Chip label={portfolio.displayCurrency} size="small" variant="outlined" />
                                ) : null}
                            </Stack>
                        </Box>
                        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                            {portfolio ? (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => { setFormError(null); setFormState({ mode: "edit", portfolio }); }}
                                >
                                    Düzenle
                                </Button>
                            ) : null}
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => { setTradeError(null); setTradeModalOpen(true); }}
                                disabled={!portfolio}
                            >
                                + Yeni İşlem
                            </Button>
                        </Stack>
                    </Stack>
                </SectionPanel>

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
                        action={
                            <Button size="small" color="inherit" onClick={() => setDetailReloadToken((v) => v + 1)}>
                                Tekrar dene
                            </Button>
                        }
                    >
                        {detailState.error}
                    </Alert>
                ) : null}

                {portfolio ? (
                    <Stack sx={{ gap: 3 }}>
                        <SectionPanel>
                            <PortfolioMetrics portfolio={portfolio} currentBalance={currentUser?.balance ?? null} />
                        </SectionPanel>

                        <SectionPanel>
                            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy Dağılımı</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Dağılım Grafiği</Typography>
                            <PortfolioAllocationChart
                                portfolio={portfolio}
                                onNewTrade={() => { setTradeError(null); setTradeModalOpen(true); }}
                            />
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
                                onStatusChange={(status) => { setTradeStatus(status); setTradePage(0); }}
                                onFiltersChange={setTradeFilters}
                                onPageChange={setTradePage}
                                onCancel={handleCancelTrade}
                                onExportPdf={handleExportPdf}
                                cancelingTradeId={cancelingTradeId}
                                exportBusy={exportBusy}
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
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => { setDeleteError(null); setDeleteTarget(portfolio); }}
                                    sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                                >
                                    Portföyü Sil
                                </Button>
                            </Stack>
                        </SectionPanel>
                    </Stack>
                ) : null}
            </Box>

            {formState ? (
                <PortfolioFormModal
                    state={formState}
                    busy={formBusy}
                    error={formError}
                    onClose={() => setFormState(null)}
                    onSubmit={submitPortfolioForm}
                />
            ) : null}
            {deleteTarget ? (
                <DeletePortfolioModal
                    portfolio={deleteTarget}
                    busy={deleteBusy}
                    error={deleteError}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                    onOpenDetail={() => setDeleteTarget(null)}
                />
            ) : null}
            {tradeModalOpen && portfolio ? (
                <NewTradeModal
                    portfolio={portfolio}
                    currentBalance={currentUser?.balance ?? null}
                    busy={tradeBusy}
                    serverError={tradeError}
                    onClose={() => setTradeModalOpen(false)}
                    onSubmit={submitNewTrade}
                />
            ) : null}
        </KapitalShell>
    );
}

export default PortfolioDetailPage;
