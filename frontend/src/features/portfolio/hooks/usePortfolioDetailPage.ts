import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import { useTradeNotifications } from "../../../hooks/useTradeNotifications";
import { ApiError } from "../../../services/api/client";
import { websocketClient } from "../../../services/websocketClient";
import { exportPortfolioPdf } from "../../../utils/portfolioPdfExport";
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
import { INSTRUMENT_LABELS, TRADE_EXPORT_PAGE_SIZE, TRADE_PAGE_SIZE } from "../types";
import type { DetailState, PortfolioFormState, TradeFilters, TradeHistoryState } from "../types";
import { filterTrades, resolveApiError } from "../utils/portfolioFormatters";

export function usePortfolioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
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
            .then((data) => {
                if (active) setDetailState({ loading: false, error: null, data });
            })
            .catch((caughtError) => {
                if (active) setDetailState({ loading: false, error: resolveApiError(caughtError, "Portföy detayı yüklenemedi."), data: null });
            });
        return () => { active = false; };
    }, [detailReloadToken, validPortfolioId]);

    useEffect(() => {
        if (!validPortfolioId) {
            setTradeHistoryState({ loading: false, error: null, page: null });
            return undefined;
        }
        let active = true;
        setTradeHistoryState((current) => ({ ...current, loading: true, error: null }));
        fetchPortfolioTrades(validPortfolioId, { status: tradeStatus, page: tradePage, size: TRADE_PAGE_SIZE })
            .then((page) => {
                if (active) setTradeHistoryState({ loading: false, error: null, page });
            })
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

    useTradeNotifications({ token, activePortfolioId: validPortfolioId, onPortfolioSignal: refreshPortfolio, resolveTradeLabel });

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

    const openEdit = (portfolio: PortfolioResponse) => {
        setFormError(null);
        setFormState({ mode: "edit", portfolio });
    };

    const openTradeModal = () => {
        setTradeError(null);
        setTradeModalOpen(true);
    };

    const openDelete = (portfolio: PortfolioResponse) => {
        setDeleteError(null);
        setDeleteTarget(portfolio);
    };

    return {
        portfolio: detailState.data,
        detailState,
        tradeHistoryState,
        tradeStatus,
        tradeFilters,
        modals: {
            formState,
            deleteTarget,
            tradeModalOpen,
        },
        pending: {
            formBusy,
            deleteBusy,
            tradeBusy,
            cancelingTradeId,
            exportBusy,
        },
        errors: {
            formError,
            deleteError,
            tradeError,
        },
        handlers: {
            backToPortfolios: () => navigate("/portfolios"),
            retryDetail: () => setDetailReloadToken((value) => value + 1),
            openEdit,
            openDelete,
            openTradeModal,
            closeForm: () => setFormState(null),
            closeDelete: () => setDeleteTarget(null),
            closeTradeModal: () => setTradeModalOpen(false),
            submitPortfolioForm,
            confirmDelete,
            submitNewTrade,
            handleCancelTrade,
            handleExportPdf,
            setTradeStatus: (status: TransactionStatus | "") => {
                setTradeStatus(status);
                setTradePage(0);
            },
            setTradeFilters,
            setTradePage,
        },
    };
}

export type PortfolioDetailPageState = ReturnType<typeof usePortfolioDetailPage>;
