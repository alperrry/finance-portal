import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import type { SourceDialogState } from "../hooks/useAdminNewsSourcesPage";
import type { AdminNewsSource, AdminNewsSourceRequest } from "../types/admin.types";

interface AdminNewsSourceDialogProps {
    state: SourceDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (payload: AdminNewsSourceRequest) => Promise<void>;
    onDelete: (source: AdminNewsSource) => Promise<void>;
}

export function AdminNewsSourceDialog({
    state,
    pending,
    onClose,
    onSubmit,
    onDelete,
}: AdminNewsSourceDialogProps) {
    const initialValue = useMemo(() => ({
        name: state?.type === "edit" ? state.source.name : "",
        sourceUrl: state?.type === "edit" ? state.source.sourceUrl : "",
    }), [state]);
    const [form, setForm] = useState(initialValue);

    useEffect(() => {
        setForm(initialValue);
    }, [initialValue]);

    if (state?.type === "delete") {
        return (
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>RSS Kaynağı</Typography>
                    Kaynağı sil
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
                        {state.source.name} kaynağı silinecek.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">Vazgeç</Button>
                    <Button variant="contained" color="error" size="small" onClick={() => void onDelete(state.source)}>Sil</Button>
                </DialogActions>
            </Dialog>
        );
    }

    if (!state) return null;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void onSubmit({ name: form.name.trim(), sourceUrl: form.sourceUrl.trim() });
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>RSS Kaynağı</Typography>
                {state.type === "edit" ? "Kaynağı düzenle" : "Kaynak ekle"}
            </DialogTitle>
            <Box component="form" onSubmit={submit}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Kaynak adı"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        required
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="RSS URL"
                        value={form.sourceUrl}
                        onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                        required
                        fullWidth
                        size="small"
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
