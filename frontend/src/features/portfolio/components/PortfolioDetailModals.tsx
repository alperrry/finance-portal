import type { PortfolioDetailPageState } from "../hooks/usePortfolioDetailPage";
import { DeletePortfolioModal } from "./DeletePortfolioModal";
import { NewTradeModal } from "./NewTradeModal";
import { PortfolioFormModal } from "./PortfolioFormModal";
import { SellPositionModal } from "./SellPositionModal";

interface PortfolioDetailModalsProps {
    page: PortfolioDetailPageState;
}

export function PortfolioDetailModals({ page }: PortfolioDetailModalsProps) {
    const { portfolio, modals, pending, errors, handlers } = page;

    return (
        <>
            {modals.formState ? (
                <PortfolioFormModal
                    state={modals.formState}
                    busy={pending.formBusy}
                    error={errors.formError}
                    onClose={handlers.closeForm}
                    onSubmit={handlers.submitPortfolioForm}
                />
            ) : null}
            {modals.deleteTarget ? (
                <DeletePortfolioModal
                    portfolio={modals.deleteTarget}
                    busy={pending.deleteBusy}
                    error={errors.deleteError}
                    onClose={handlers.closeDelete}
                    onConfirm={handlers.confirmDelete}
                    onOpenDetail={handlers.closeDelete}
                />
            ) : null}
            {modals.tradeModalOpen && portfolio ? (
                <NewTradeModal
                    portfolio={portfolio}
                    busy={pending.tradeBusy}
                    serverError={errors.tradeError}
                    onClose={handlers.closeTradeModal}
                    onSubmit={handlers.handlePositionSubmit}
                />
            ) : null}
            {modals.sellTarget ? (
                <SellPositionModal
                    position={modals.sellTarget}
                    busy={pending.sellBusy}
                    error={errors.sellError}
                    onClose={handlers.handleSellClose}
                    onSubmit={handlers.handleSellSubmit}
                />
            ) : null}
        </>
    );
}
