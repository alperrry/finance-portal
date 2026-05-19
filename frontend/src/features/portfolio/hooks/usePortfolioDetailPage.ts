import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import { useTradeNotifications } from "../../../hooks/useTradeNotifications";
import { ApiError } from "../../../services/api/client";
import { websocketClient } from "../../../services/websocketClient";
import {
    closeManualPosition,
    createManualPosition,
    deleteManualPosition,
    deletePortfolio,
    fetchManualPositions,
    fetchPortfolio,
    updatePortfolio,
    type ClosePositionRequest,
    type CreatePortfolioRequest,
    type ManualPositionRequest,
    type ManualPositionResponse,
    type PortfolioResponse,
    type PositionKind,
} from "../api/portfolioApi";
import { exportPortfolioPdf } from "../../../utils/portfolioPdfExport";
import type { DetailState, PortfolioFormState } from "../types";
import { resolveApiError } from "../utils/portfolioFormatters";

export function usePortfolioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { showToast } = useToast();
    const portfolioId = Number(id);
    const validPortfolioId = Number.isFinite(portfolioId) && portfolioId > 0 ? portfolioId : null;

    const [detailReloadToken, setDetailReloadToken] = useState(0);
    const [detailState, setDetailState] = useState<DetailState>({ loading: false, error: null, data: null });
    const [formState, setFormState] = useState<PortfolioFormState | null>(null);
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PortfolioResponse | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [tradeModalOpen, setTradeModalOpen] = useState(false);
    const [tradeBusy, setTradeBusy] = useState(false);
    const [tradeError, setTradeError] = useState<string | null>(null);
    const [pdfBusy, setPdfBusy] = useState(false);
    const [sellTarget, setSellTarget] = useState<ManualPositionResponse | null>(null);
    const [sellBusy, setSellBusy] = useState(false);
    const [sellError, setSellError] = useState<string | null>(null);

    // Position state
    const [openPositions, setOpenPositions] = useState<ManualPositionResponse[]>([]);
    const [closedPositions, setClosedPositions] = useState<ManualPositionResponse[]>([]);
    const [positionsLoading, setPositionsLoading] = useState(false);
    const [positionsError, setPositionsError] = useState<string | null>(null);
    const [positionKindTab, setPositionKindTab] = useState<PositionKind>("OPEN");
    const [positionReloadToken, setPositionReloadToken] = useState(0);

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

    // Load both OPEN and CLOSED positions
    useEffect(() => {
        if (!validPortfolioId) {
            setOpenPositions([]);
            setClosedPositions([]);
            return undefined;
        }
        let active = true;
        setPositionsLoading(true);
        setPositionsError(null);

        Promise.all([
            fetchManualPositions(validPortfolioId, "OPEN"),
            fetchManualPositions(validPortfolioId, "CLOSED"),
        ])
            .then(([openPage, closedPage]) => {
                if (!active) return;
                setOpenPositions(openPage.content);
                setClosedPositions(closedPage.content);
            })
            .catch((caughtError) => {
                if (active) setPositionsError(resolveApiError(caughtError, "Pozisyonlar yüklenemedi."));
            })
            .finally(() => {
                if (active) setPositionsLoading(false);
            });

        return () => { active = false; };
    }, [validPortfolioId, positionReloadToken]);

    const refreshPortfolio = useCallback((changedPortfolioId?: number) => {
        if (!validPortfolioId || (changedPortfolioId && changedPortfolioId !== validPortfolioId)) return;
        setDetailReloadToken((value) => value + 1);
    }, [validPortfolioId]);

    useTradeNotifications({ token, activePortfolioId: validPortfolioId, onPortfolioSignal: refreshPortfolio });

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
                    ? "Bu portföyde pozisyon var. Önce pozisyonları kapatman gerekir."
                    : resolveApiError(caughtError, "Portföy silinemedi.");
            setDeleteError(message);
        } finally {
            setDeleteBusy(false);
        }
    };

    const handlePositionSubmit = async (payload: ManualPositionRequest) => {
        if (!validPortfolioId) return;
        setTradeBusy(true);
        setTradeError(null);
        try {
            await createManualPosition(validPortfolioId, payload);
            setTradeModalOpen(false);
            showToast("Pozisyon kaydedildi.", "success");
            setPositionReloadToken((v) => v + 1);
        } catch (caughtError) {
            setTradeError(resolveApiError(caughtError, "Pozisyon kaydedilemedi."));
        } finally {
            setTradeBusy(false);
        }
    };

    const handlePositionDelete = async (positionId: number) => {
        if (!validPortfolioId) return;
        try {
            await deleteManualPosition(validPortfolioId, positionId);
            showToast("Pozisyon silindi.", "info");
            setPositionReloadToken((v) => v + 1);
        } catch (caughtError) {
            showToast(resolveApiError(caughtError, "Pozisyon silinemedi."), "error");
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

    const handleSellOpen = (pos: ManualPositionResponse) => {
        setSellError(null);
        setSellTarget(pos);
    };

    const handleSellClose = () => setSellTarget(null);

    const handleSellSubmit = async (payload: ClosePositionRequest) => {
        if (!validPortfolioId || !sellTarget) return;
        setSellBusy(true);
        setSellError(null);
        try {
            await closeManualPosition(validPortfolioId, sellTarget.id, payload);
            setSellTarget(null);
            showToast("Pozisyon kapatıldı.", "success");
            setPositionReloadToken((v) => v + 1);
        } catch (caughtError) {
            setSellError(resolveApiError(caughtError, "Pozisyon kapatılamadı."));
        } finally {
            setSellBusy(false);
        }
    };

    const handlePdfExport = async () => {
        if (!detailState.data) return;
        setPdfBusy(true);
        try {
            await exportPortfolioPdf({ portfolio: detailState.data, manualPositions: openPositions });
        } finally {
            setPdfBusy(false);
        }
    };

    const openDelete = (portfolio: PortfolioResponse) => {
        setDeleteError(null);
        setDeleteTarget(portfolio);
    };

    return {
        portfolio: detailState.data,
        detailState,
        openPositions,
        closedPositions,
        positionsLoading,
        positionsError,
        positionKindTab,
        modals: {
            formState,
            deleteTarget,
            tradeModalOpen,
            sellTarget,
        },
        pending: {
            formBusy,
            deleteBusy,
            tradeBusy,
            pdfBusy,
            sellBusy,
        },
        errors: {
            formError,
            deleteError,
            tradeError,
            sellError,
        },
        handlers: {
            backToPortfolios: () => navigate("/portfolios"),
            retryDetail: () => setDetailReloadToken((value) => value + 1),
            retryPositions: () => setPositionReloadToken((v) => v + 1),
            openEdit,
            openDelete,
            openTradeModal,
            closeForm: () => setFormState(null),
            closeDelete: () => setDeleteTarget(null),
            closeTradeModal: () => setTradeModalOpen(false),
            handlePdfExport,
            handleSellOpen,
            handleSellClose,
            handleSellSubmit,
            submitPortfolioForm,
            confirmDelete,
            handlePositionSubmit,
            handlePositionDelete,
            setPositionKindTab: (kind: PositionKind) => setPositionKindTab(kind),
        },
    };
}

export type PortfolioDetailPageState = ReturnType<typeof usePortfolioDetailPage>;
