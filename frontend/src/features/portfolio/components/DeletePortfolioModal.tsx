import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
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
    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="overline" color="error" sx={{ fontWeight: 800 }}>Silme Onayı</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{portfolio.name} silinsin mi?</Typography>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Bu portföyü silmek istediğine emin misin? İçinde pozisyon veya bekleyen emir varsa silme engellenir.
                </Typography>
                {error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                        {error.includes("pozisyon") ? (
                            <Button size="small" color="inherit" onClick={onOpenDetail} sx={{ ml: 1 }}>
                                Detaya git
                            </Button>
                        ) : null}
                    </Alert>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Vazgeç</Button>
                <Button variant="contained" color="error" onClick={onConfirm} disabled={busy}>
                    {busy ? "Siliniyor..." : "Sil"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
