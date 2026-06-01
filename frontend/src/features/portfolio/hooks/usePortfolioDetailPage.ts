import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    fetchManualPositionSimulation,
    updatePortfolio,
    type ClosePositionRequest,
    type CreatePortfolioRequest,
    type ManualPositionRequest,
    type ManualPositionResponse,
    type PortfolioResponse,
    type PositionKind,
    type SimulationResponse,
} from "../api/portfolioApi";
import { exportPortfolioPdf } from "../../../utils/portfolioPdfExport";
import type { DetailState, PortfolioFormState } from "../types";
import { resolveApiError } from "../utils/portfolioFormatters";

type SimulationTarget = {
    id: number;
    title: string;
    subtitle: string;
};

export function usePortfolioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
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
    const [simulationTarget, setSimulationTarget] = useState<SimulationTarget | null>(null);
    const [simulationBusy, setSimulationBusy] = useState(false);
    const [simulationError, setSimulationError] = useState<string | null>(null);
    const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);

    // Position state
    const [openPositions, setOpenPositions] = useState<ManualPositionResponse[]>([]);
    const [closedPositions, setClosedPositions] = useState<ManualPositionResponse[]>([]);
    const [positionsLoading, setPositionsLoading] = useState(false);
    const [positionsError, setPositionsError] = useState<string | null>(null);
    const [positionKindTab, setPositionKindTab] = useState<PositionKind>("OPEN");
    const [positionReloadToken, setPositionReloadToken] = useState(0);

    useEffect(() => {
        if (!validPortfolioId) {
            setDetailState({ loading: false, error: t("portfolio.errors.invalidId"), data: null });
            return undefined;
        }
        let active = true;
        setDetailState((current) => ({ ...current, loading: true, error: null }));
        fetchPortfolio(validPortfolioId)
            .then((data) => {
                if (active) setDetailState({ loading: false, error: null, data });
            })
            .catch((caughtError) => {
                if (active) setDetailState({ loading: false, error: resolveApiError(caughtError, t("portfolio.errors.detailFailed")), data: null });
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
                if (active) setPositionsError(resolveApiError(caughtError, t("portfolio.errors.positionsFailed")));
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
            showToast(t("portfolio.errors.updated"), "success");
            setFormState(null);
            refreshPortfolio(formState.portfolio.id);
        } catch (caughtError) {
            setFormError(resolveApiError(caughtError, t("portfolio.errors.saveFailed")));
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
            showToast(t("portfolio.errors.deleted"), "success");
            setDeleteTarget(null);
            navigate("/portfolios");
        } catch (caughtError) {
            const message =
                caughtError instanceof ApiError && caughtError.status === 409
                    ? t("portfolio.errors.hasPositions")
                    : resolveApiError(caughtError, t("portfolio.errors.deleteFailed"));
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
            showToast(t("portfolio.errors.positionSaved"), "success");
            setPositionReloadToken((v) => v + 1);
        } catch (caughtError) {
            setTradeError(resolveApiError(caughtError, t("portfolio.errors.positionSaveFailed")));
        } finally {
            setTradeBusy(false);
        }
    };

    const handlePositionDelete = async (positionId: number) => {
        if (!validPortfolioId) return;
        try {
            await deleteManualPosition(validPortfolioId, positionId);
            showToast(t("portfolio.errors.positionDeleted"), "info");
            setPositionReloadToken((v) => v + 1);
        } catch (caughtError) {
            showToast(resolveApiError(caughtError, t("portfolio.errors.positionDeleteFailed")), "error");
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
            showToast(t("portfolio.errors.positionClosed"), "success");
            setPositionReloadToken((v) => v + 1);
        } catch (caughtError) {
            setSellError(resolveApiError(caughtError, t("portfolio.errors.positionCloseFailed")));
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

    const loadSimulation = async (target: SimulationTarget) => {
        setSimulationTarget(target);
        setSimulationBusy(true);
        setSimulationError(null);
        setSimulationData(null);
        try {
            const data = await fetchManualPositionSimulation(target.id, ["USD", "INFLATION_ADJUSTED"]);
            setSimulationData(data);
        } catch (caughtError) {
            setSimulationError(resolveApiError(caughtError, t("portfolio.errors.simulationFailed")));
        } finally {
            setSimulationBusy(false);
        }
    };

    const handleManualPositionSimulation = (position: ManualPositionResponse) => {
        void loadSimulation({
            id: position.id,
            title: position.instrumentSymbol ?? position.bankName ?? "Pozisyon",
            subtitle: position.instrumentName ?? position.positionKind,
        });
    };

    const closeSimulation = () => {
        setSimulationTarget(null);
        setSimulationBusy(false);
        setSimulationError(null);
        setSimulationData(null);
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
            simulationTarget,
        },
        pending: {
            formBusy,
            deleteBusy,
            tradeBusy,
            pdfBusy,
            sellBusy,
            simulationBusy,
        },
        errors: {
            formError,
            deleteError,
            tradeError,
            sellError,
            simulationError,
        },
        simulationData,
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
            handleManualPositionSimulation,
            retrySimulation: () => {
                if (simulationTarget) void loadSimulation(simulationTarget);
            },
            closeSimulation,
            setPositionKindTab: (kind: PositionKind) => setPositionKindTab(kind),
        },
    };
}

export type PortfolioDetailPageState = ReturnType<typeof usePortfolioDetailPage>;
