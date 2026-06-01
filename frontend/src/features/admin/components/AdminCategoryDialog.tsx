import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{t("admin.categories.cols.category")}</Typography>
                    {t("admin.categories.dialog.deleteTitle")}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
                        {t("admin.categories.dialog.deleteAlert", { name: state.category.name })}
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">{t("admin.dialogs.cancel")}</Button>
                    <Button variant="contained" color="error" size="small" onClick={() => void onDelete(state.category)}>{t("admin.categories.actions.delete")}</Button>
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
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{t("admin.categories.cols.category")}</Typography>
                {state.type === "edit" ? t("admin.categories.dialog.editTitle") : t("admin.categories.dialog.addTitle")}
            </DialogTitle>
            <Box component="form" onSubmit={submit}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label={t("admin.categories.dialog.nameLabel")}
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
                        label={t("admin.categories.dialog.activeLabel")}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">{t("admin.dialogs.cancel")}</Button>
                    <Button type="submit" variant="contained" color="secondary" size="small" disabled={pending}>
                        {pending ? t("admin.dialogs.saving") : t("admin.dialogs.save")}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
