import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../../services/api/client";
import {
    createPortfolio,
    deletePortfolio,
    updatePortfolio,
    type CreatePortfolioRequest,
    type PortfolioResponse,
} from "../api/portfolioApi";
import { useToast } from "../../../components/ToastContext";
import { resolveApiError } from "../utils/portfolioFormatters";
import type { PortfolioFormState } from "../types";

export function usePortfolioModals(reload: () => void) {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [formState, setFormState] = useState<PortfolioFormState | null>(null);
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PortfolioResponse | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const submitPortfolioForm = async (payload: CreatePortfolioRequest) => {
        if (!formState) return;
        setFormBusy(true);
        setFormError(null);
        try {
            if (formState.mode === "create") {
                const created = await createPortfolio(payload);
                showToast("Portföy oluşturuldu.", "success");
                navigate(`/portfolios/${created.id}`);
            } else if (formState.portfolio) {
                await updatePortfolio(formState.portfolio.id, { name: payload.name });
                showToast("Portföy güncellendi.", "success");
            }
            setFormState(null);
            reload();
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
            reload();
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

    return {
        formState,
        formBusy,
        formError,
        deleteTarget,
        deleteBusy,
        deleteError,
        openCreate: () => { setFormError(null); setFormState({ mode: "create" }); },
        openEdit: (portfolio: PortfolioResponse) => { setFormError(null); setFormState({ mode: "edit", portfolio }); },
        openDelete: (portfolio: PortfolioResponse) => { setDeleteError(null); setDeleteTarget(portfolio); },
        closeForm: () => setFormState(null),
        closeDelete: () => setDeleteTarget(null),
        submitPortfolioForm,
        confirmDelete,
    };
}