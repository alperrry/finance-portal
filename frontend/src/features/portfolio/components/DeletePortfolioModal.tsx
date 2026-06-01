import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { PortfolioResponse } from "../api/portfolioApi";

type Props = {
    portfolio: PortfolioResponse;
    busy: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: () => void;
    onOpenDetail: () => void;
};

export function DeletePortfolioModal({ portfolio, busy, error, onClose, onConfirm, onOpenDetail }: Props) {
    const { t } = useTranslation();
    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="overline" color="error" sx={{ fontWeight: 800 }}>{t("portfolio.deleteModal.title")}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{portfolio.name} silinsin mi?</Typography>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t("portfolio.deleteModal.message")}
                </Typography>
                {error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                        {error.includes("pozisyon") ? (
                            <Button size="small" color="inherit" onClick={onOpenDetail} sx={{ ml: 1 }}>
                                {t("portfolio.deleteModal.goToDetail")}
                            </Button>
                        ) : null}
                    </Alert>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("portfolio.deleteModal.cancel")}</Button>
                <Button variant="contained" color="error" onClick={onConfirm} disabled={busy}>
                    {busy ? "Siliniyor..." : t("portfolio.card.delete")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
