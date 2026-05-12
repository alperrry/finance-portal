import { Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { KapitalShell } from "../../../components/layout";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { DeletePortfolioModal } from "../components/DeletePortfolioModal";
import { PortfolioDashboardContent } from "../components/PortfolioDashboardContent";
import { PortfolioFormModal } from "../components/PortfolioFormModal";
import { usePortfolioDashboard } from "../hooks/usePortfolioDashboard";
import { usePortfolioModals } from "../hooks/usePortfolioModals";

export default function PortfolioDashboardPage() {
    const navigate = useNavigate();
    const { portfolios, listState, reload, isEmpty } = usePortfolioDashboard();
    const {
        formState, formBusy, formError,
        deleteTarget, deleteBusy, deleteError,
        openCreate, openEdit, openDelete,
        closeForm, closeDelete,
        submitPortfolioForm, confirmDelete,
    } = usePortfolioModals(reload);

    return (
        <KapitalShell activePage="portfolios" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <SectionPanel sx={{ mb: 3 }}>
                    <PageHeader
                        kicker="Kişisel Yatırım Merkezi"
                        title="Portföylerim"
                        subtitle="Limit emirlerini, pozisyon dağılımını ve gerçekleşen işlemleri tek panelden yönetin."
                        actions={
                            <Button variant="contained" color="secondary" onClick={openCreate}>
                                + Yeni Portföy
                            </Button>
                        }
                    />
                </SectionPanel>

                <PortfolioDashboardContent
                    portfolios={portfolios}
                    loading={listState.loading}
                    error={listState.error}
                    isEmpty={isEmpty}
                    onReload={reload}
                    onCreate={openCreate}
                    onOpen={(portfolio) => navigate(`/portfolios/${portfolio.id}`)}
                    onEdit={openEdit}
                    onDelete={openDelete}
                />
            </Box>

            {formState && (
                <PortfolioFormModal
                    state={formState}
                    busy={formBusy}
                    error={formError}
                    onClose={closeForm}
                    onSubmit={submitPortfolioForm}
                />
            )}
            {deleteTarget && (
                <DeletePortfolioModal
                    portfolio={deleteTarget}
                    busy={deleteBusy}
                    error={deleteError}
                    onClose={closeDelete}
                    onConfirm={confirmDelete}
                    onOpenDetail={() => { navigate(`/portfolios/${deleteTarget.id}`); closeDelete(); }}
                />
            )}
        </KapitalShell>
    );
}
