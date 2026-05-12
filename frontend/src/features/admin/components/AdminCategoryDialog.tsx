import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField, Typography } from "@mui/material";
import type { CategoryDialogState } from "../hooks/useAdminCategoriesPage";
import type { AdminCategory, AdminCategoryRequest } from "../types/admin.types";

interface AdminCategoryDialogProps {
    state: CategoryDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (payload: AdminCategoryRequest) => Promise<void>;
    onDelete: (category: AdminCategory) => Promise<void>;
}

export function AdminCategoryDialog({ state, pending, onClose, onSubmit, onDelete }: AdminCategoryDialogProps) {
    const initialValue = useMemo(() => ({
        name: state?.type === "edit" ? state.category.name : "",
        isActive: state?.type === "edit" ? state.category.active : true,
    }), [state]);
    const [form, setForm] = useState(initialValue);

    useEffect(() => {
        setForm(initialValue);
    }, [initialValue]);

    if (state?.type === "delete") {
        return (
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Kategori</Typography>
                    Kategoriyi sil
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
                        {state.category.name} kategorisi silinecek.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">Vazgeç</Button>
                    <Button variant="contained" color="error" size="small" onClick={() => void onDelete(state.category)}>Sil</Button>
                </DialogActions>
            </Dialog>
        );
    }

    if (!state) return null;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void onSubmit({ name: form.name.trim(), isActive: form.isActive });
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Kategori</Typography>
                {state.type === "edit" ? "Kategoriyi düzenle" : "Kategori ekle"}
            </DialogTitle>
            <Box component="form" onSubmit={submit}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Kategori adı"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        required
                        fullWidth
                        size="small"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={form.isActive}
                                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                            />
                        }
                        label="Aktif"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">Vazgeç</Button>
                    <Button type="submit" variant="contained" color="secondary" size="small" disabled={pending}>
                        {pending ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
