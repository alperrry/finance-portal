import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../../services/api/client";
import {
    createPortfolio,
    deletePortfolio,
    fetchPortfolio,
    fetchPortfolios,
    updatePortfolio,
    type CreatePortfolioRequest,
    type PortfolioResponse,
} from "../api/portfolioApi";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import { KapitalShell } from "../../../components/layout";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { useTradeNotifications } from "../../../hooks/useTradeNotifications";
import { DeletePortfolioModal } from "../components/DeletePortfolioModal";
import { PortfolioCard } from "../components/PortfolioCard";
import { PortfolioFormModal } from "../components/PortfolioFormModal";
import type { PortfolioFormState, PortfolioLoadState } from "../types";
import { resolveApiError } from "../utils/portfolioFormatters";

export default function PortfolioDashboardPage() {
    const navigate = useNavigate();
    const { token, refreshCurrentUser } = useAuth();
    const { showToast } = useToast();
    const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([]);
    const [listState, setListState] = useState<PortfolioLoadState>({ loading: true, error: null });
    const [reloadToken, setReloadToken] = useState(0);
    const [formState, setFormState] = useState<PortfolioFormState | null>(null);
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PortfolioResponse | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setListState({ loading: true, error: null });
        fetchPortfolios()
            .then(async (data) => {
                if (!active) return;
                const detailResults = await Promise.allSettled(data.map((portfolio) => fetchPortfolio(portfolio.id)));
                if (!active) return;
                const detailsById = new Map<number, PortfolioResponse>();
                detailResults.forEach((result) => { if (result.status === "fulfilled") detailsById.set(result.value.id, result.value); });
                setPortfolios(data.map((portfolio) => detailsById.get(portfolio.id) ?? portfolio));
                setListState({ loading: false, error: null });
            })
            .catch((caughtError) => {
                if (active) setListState({ loading: false, error: resolveApiError(caughtError, "Portföyler yüklenemedi.") });
            });
        return () => { active = false; };
    }, [reloadToken]);

    const refreshPortfolio = useCallback(() => { setReloadToken((value) => value + 1); }, []);
    useTradeNotifications({ token, activePortfolioId: null, onPortfolioSignal: refreshPortfolio, onBalanceSignal: refreshCurrentUser });

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
            refreshPortfolio();
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
            setReloadToken((value) => value + 1);
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

    const isEmpty = !listState.loading && !listState.error && portfolios.length === 0;

    return (
        <KapitalShell activePage="portfolios" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <SectionPanel sx={{ mb: 3 }}>
                    <PageHeader
                        kicker="Kişisel Yatırım Merkezi"
                        title="Portföylerim"
                        subtitle="Limit emirlerini, pozisyon dağılımını ve gerçekleşen işlemleri tek panelden yönetin."
                        actions={
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => { setFormError(null); setFormState({ mode: "create" }); }}
                            >
                                + Yeni Portföy
                            </Button>
                        }
                    />
                </SectionPanel>

                {listState.error ? (
                    <Alert
                        severity="error"
                        sx={{ mb: 2 }}
                        action={<Button size="small" color="inherit" onClick={() => setReloadToken((v) => v + 1)}>Tekrar dene</Button>}
                    >
                        {listState.error}
                    </Alert>
                ) : null}

                {listState.loading ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Card key={index}>
                                <CardContent>
                                    <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
                                    <Skeleton variant="text" width="40%" sx={{ mb: 2 }} />
                                    <Skeleton variant="text" width="80%" />
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                ) : null}

                {isEmpty ? (
                    <Stack sx={{ alignItems: "center", py: 8, gap: 1.5 }}>
                        <Typography variant="h3" aria-hidden="true">◌</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>Henüz portföyün yok.</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, textAlign: "center" }}>
                            İlk portföyünü oluştur, sanal bakiyeni takip et ve fiyat eşleşmesiyle otomatik trade akışını başlat.
                        </Typography>
                        <Button
                            variant="contained"
                            color="secondary"
                            sx={{ mt: 1 }}
                            onClick={() => { setFormError(null); setFormState({ mode: "create" }); }}
                        >
                            İlk Portföyü Oluştur
                        </Button>
                    </Stack>
                ) : null}

                {!listState.loading && portfolios.length > 0 ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
                        {portfolios.map((portfolio) => (
                            <PortfolioCard
                                key={portfolio.id}
                                portfolio={portfolio}
                                onOpen={() => navigate(`/portfolios/${portfolio.id}`)}
                                onEdit={() => { setFormError(null); setFormState({ mode: "edit", portfolio }); }}
                                onDelete={() => { setDeleteError(null); setDeleteTarget(portfolio); }}
                            />
                        ))}
                    </Box>
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
                    onOpenDetail={() => { navigate(`/portfolios/${deleteTarget.id}`); setDeleteTarget(null); }}
                />
            ) : null}
        </KapitalShell>
    );
}
