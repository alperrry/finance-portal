import { useState, type FormEvent } from "react";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, NativeSelect, Typography } from "@mui/material";
import type { NewsDialogState } from "../hooks/useAdminNewsManagementPage";
import type { AdminCategory, AdminNewsStatus, AdminNewsSummary } from "../types/admin.types";
import { newsStatusLabel } from "../utils/adminFormatters";

const NEWS_STATUSES: AdminNewsStatus[] = ["published", "archived", "removed"];

interface StatusDialogProps {
    state: NewsDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (news: AdminNewsSummary, status: AdminNewsStatus) => Promise<void>;
}

export function AdminNewsStatusDialog({ state, pending, onClose, onSubmit }: StatusDialogProps) {
    const news = state?.type === "status" ? state.news : null;
    if (!news) return null;

    return (
        <AdminNewsStatusDialogForm
            key={news.id}
            news={news}
            pending={pending}
            onClose={onClose}
            onSubmit={onSubmit}
        />
    );
}

function AdminNewsStatusDialogForm({ news, pending, onClose, onSubmit }: {
    news: AdminNewsSummary;
    pending: boolean;
    onClose: () => void;
    onSubmit: (news: AdminNewsSummary, status: AdminNewsStatus) => Promise<void>;
}) {
    const [status, setStatus] = useState<AdminNewsStatus>(news.status);

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Haber</Typography>
                Durum değiştir
            </DialogTitle>
            <Box component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void onSubmit(news, status); }}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <NativeSelect value={status} onChange={(event) => setStatus(event.target.value as AdminNewsStatus)}>
                            {NEWS_STATUSES.map((item) => <option key={item} value={item}>{newsStatusLabel(item)}</option>)}
                        </NativeSelect>
                    </FormControl>
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

interface CategoryOverrideDialogProps {
    state: NewsDialogState;
    categories: AdminCategory[];
    pending: boolean;
    onClose: () => void;
    onSubmit: (news: AdminNewsSummary, categoryIds: number[]) => Promise<void>;
}

export function AdminNewsCategoryOverrideDialog({
    state,
    categories,
    pending,
    onClose,
    onSubmit,
}: CategoryOverrideDialogProps) {
    const news = state?.type === "categories" ? state.news : null;
    if (!news) return null;

    return (
        <AdminNewsCategoryOverrideDialogForm
            key={news.id}
            news={news}
            categories={categories}
            pending={pending}
            onClose={onClose}
            onSubmit={onSubmit}
        />
    );
}

function AdminNewsCategoryOverrideDialogForm({
    news,
    categories,
    pending,
    onClose,
    onSubmit,
}: {
    news: AdminNewsSummary;
    categories: AdminCategory[];
    pending: boolean;
    onClose: () => void;
    onSubmit: (news: AdminNewsSummary, categoryIds: number[]) => Promise<void>;
}) {
    const [selectedIds, setSelectedIds] = useState<number[]>(news.categories.map((category) => category.id));

    const toggle = (categoryId: number) => {
        setSelectedIds((current) => current.includes(categoryId)
            ? current.filter((id) => id !== categoryId)
            : [...current, categoryId]);
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Haber</Typography>
                Kategorileri düzenle
            </DialogTitle>
            <Box component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void onSubmit(news, selectedIds); }}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ maxHeight: 280, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: "14px", p: 1.5, display: "flex", flexDirection: "column" }}>
                        {categories.filter((category) => category.active).map((category) => (
                            <FormControlLabel
                                key={category.id}
                                control={<Checkbox size="small" checked={selectedIds.includes(category.id)} onChange={() => toggle(category.id)} />}
                                label={category.name}
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">Vazgeç</Button>
                    <Button type="submit" variant="contained" color="secondary" size="small" disabled={pending || selectedIds.length === 0}>
                        {pending ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
