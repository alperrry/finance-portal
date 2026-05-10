import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useState, type FormEvent } from "react";
import type { CreatePortfolioRequest, DisplayCurrency } from "../api/portfolioApi";
import type { PortfolioFormState } from "../types";
import { CURRENCIES } from "../types";

type Props = {
    state: PortfolioFormState;
    busy: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (payload: CreatePortfolioRequest) => void;
};

export function PortfolioFormModal({ state, busy, error, onClose, onSubmit }: Props) {
    const [name, setName] = useState(state.portfolio?.name ?? "");
    const [currency, setCurrency] = useState<DisplayCurrency>(state.portfolio?.displayCurrency ?? "TRY");
    const title = state.mode === "create" ? "Yeni Portföy" : "Portföyü Düzenle";

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;
        onSubmit({ name: trimmedName, displayCurrency: currency });
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="portfolio-form-title">
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <DialogTitle id="portfolio-form-title" sx={{ pb: 0 }}>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack sx={{ gap: 2, pt: 1 }}>
                        <TextField
                            label="Portföy Adı"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Uzun vadeli yatırım"
                            slotProps={{ htmlInput: { maxLength: 255 } }}
                            autoFocus
                            fullWidth
                            size="small"
                        />
                        <FormControl size="small" fullWidth>
                            <InputLabel id="portfolio-currency-label">Para Birimi</InputLabel>
                            <Select
                                labelId="portfolio-currency-label"
                                value={currency}
                                disabled={state.mode === "edit"}
                                label="Para Birimi"
                                onChange={(event: SelectChangeEvent) => setCurrency(event.target.value as DisplayCurrency)}
                            >
                                {CURRENCIES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {state.mode === "edit" ? (
                            <Typography variant="caption" color="text.secondary">
                                Para birimi mevcut pozisyon değerlemeleriyle uyum için sonradan değiştirilemez.
                            </Typography>
                        ) : null}
                        {error ? <Alert severity="error">{error}</Alert> : null}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>İptal</Button>
                    <Button type="submit" variant="contained" color="secondary" disabled={busy || !name.trim()}>
                        {busy ? "Kaydediliyor..." : state.mode === "create" ? "Oluştur" : "Kaydet"}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
