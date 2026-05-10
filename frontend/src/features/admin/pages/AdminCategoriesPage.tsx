import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { ApiError } from "../../../services/api/client";
import { useToast } from "../../../components/ToastContext";
import { createAdminCategory, deleteAdminCategory, updateAdminCategory } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import { useAdminCategories, useFilteredAdminCategories } from "../api/useAdminCategories";
import type { AdminCategory, AdminCategoryRequest, AuditLogItem } from "../types/admin.types";

const CATEGORY_AUDIT_TARGETS = ["category"];

const PANEL_SX = {
    borderRadius: "22px",
    overflow: "hidden",
    bgcolor: "rgba(247, 245, 241, 0.92)",
    border: "1px solid",
    borderColor: "rgba(255, 255, 255, 0.72)",
    boxShadow: "0 18px 52px rgba(17, 17, 17, 0.09)",
} as const;

const PANEL_HEAD_SX = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    p: "20px 22px",
    borderBottom: "1px solid",
    borderColor: "divider",
} as const;

const KICKER_SX = {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "text.secondary",
} as const;


type CategoryDialogState =
    | { type: "create"; category?: undefined }
    | { type: "edit"; category: AdminCategory }
    | { type: "delete"; category: AdminCategory }
    | null;

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

function formatDateTime(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function auditTitle(item: AuditLogItem) {
    const titles: Record<string, string> = {
        CATEGORY_CREATED: "Kategori oluşturuldu",
        CATEGORY_UPDATED: "Kategori güncellendi",
        CATEGORY_DELETED: "Kategori silindi",
    };
    return titles[item.action] ?? item.action;
}

export function AdminCategoriesPage() {
    const { showToast } = useToast();
    const categoriesQuery = useAdminCategories();
    const auditQuery = useAdminAuditLogs(CATEGORY_AUDIT_TARGETS);
    const [search, setSearch] = useState("");
    const [dialog, setDialog] = useState<CategoryDialogState>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const categories = useFilteredAdminCategories(categoriesQuery.data, search);

    const refreshAfterMutation = () => {
        invalidateAdminQuery({ scope: "categories" });
        invalidateAdminQuery({ scope: "category-audit" });
        invalidateAdminQuery({ scope: "news-list" });
    };

    const saveCategory = async (payload: AdminCategoryRequest) => {
        setPendingAction("save");
        try {
            if (dialog?.type === "edit") {
                await updateAdminCategory(dialog.category.id, payload);
                showToast("Kategori güncellendi.", "success");
            } else {
                await createAdminCategory(payload);
                showToast("Kategori oluşturuldu.", "success");
            }
            refreshAfterMutation();
            setDialog(null);
        } catch (caughtError) {
            showToast(resolveError(caughtError, "Kategori kaydedilemedi."), "error");
        } finally {
            setPendingAction(null);
        }
    };

    const removeCategory = async (category: AdminCategory) => {
        setPendingAction(`delete-${category.id}`);
        try {
            await deleteAdminCategory(category.id);
            showToast("Kategori silindi.", "success");
            refreshAfterMutation();
            setDialog(null);
        } catch (caughtError) {
            showToast(resolveError(caughtError, "Kategori silinemedi."), "error");
        } finally {
            setPendingAction(null);
        }
    };

    const toggleCategory = async (category: AdminCategory) => {
        setPendingAction(`toggle-${category.id}`);
        try {
            await updateAdminCategory(category.id, { name: category.name, isActive: !category.active });
            showToast(category.active ? "Kategori pasifleştirildi." : "Kategori aktifleştirildi.", "success");
            refreshAfterMutation();
        } catch (caughtError) {
            showToast(resolveError(caughtError, "Kategori durumu güncellenemedi."), "error");
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Paper sx={PANEL_SX}>
                <Box sx={PANEL_HEAD_SX}>
                    <Box>
                        <Typography sx={KICKER_SX}>Category Management</Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Kategori Yönetimi</Typography>
                    </Box>
                    <Button variant="contained" color="secondary" size="small" onClick={() => setDialog({ type: "create" })}>
                        Kategori ekle
                    </Button>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider", alignItems: "center" }}>
                    <TextField
                        size="small"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Kategori ara"
                    />
                    <Typography sx={{ fontWeight: 700 }}>{categories.length} kategori</Typography>
                </Box>

                {categoriesQuery.loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Kategoriler yükleniyor...</Typography> : null}
                {!categoriesQuery.loading && categoriesQuery.error ? <Alert severity="error" sx={{ m: 2 }}>{categoriesQuery.error}</Alert> : null}
                {!categoriesQuery.loading && !categoriesQuery.error && categories.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Bu filtrede kategori yok.</Typography> : null}

                {!categoriesQuery.loading && !categoriesQuery.error && categories.length > 0 ? (
                    <TableContainer sx={{ overflowX: "auto" }}>
                        <Table size="small" sx={{ minWidth: 680 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Kategori</TableCell>
                                    <TableCell>Durum</TableCell>
                                    <TableCell>Oluşturma</TableCell>
                                    <TableCell>Güncelleme</TableCell>
                                    <TableCell>Aksiyon</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{category.name}</Typography></TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={category.active ? "Aktif" : "Pasif"}
                                                sx={{
                                                    height: 22,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    bgcolor: category.active ? "rgba(46, 164, 79, 0.12)" : "rgba(220, 53, 69, 0.12)",
                                                    color: category.active ? "#1a7a35" : "#9e1818",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{formatDateTime(category.createdAt)}</TableCell>
                                        <TableCell>{formatDateTime(category.updatedAt)}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    disabled={pendingAction === `toggle-${category.id}`}
                                                    onClick={() => void toggleCategory(category)}
                                                >
                                                    {category.active ? "Pasifleştir" : "Aktifleştir"}
                                                </Button>
                                                <Button size="small" variant="outlined" onClick={() => setDialog({ type: "edit", category })}>Düzenle</Button>
                                                <Button size="small" variant="outlined" color="error" onClick={() => setDialog({ type: "delete", category })}>Sil</Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : null}
            </Paper>

            <AuditPanel loading={auditQuery.loading} error={auditQuery.error} items={auditQuery.data} />
            <CategoryDialog
                state={dialog}
                pending={pendingAction === "save"}
                onClose={() => setDialog(null)}
                onSubmit={saveCategory}
                onDelete={removeCategory}
            />
        </Box>
    );
}

function CategoryDialog({ state, pending, onClose, onSubmit, onDelete }: {
    state: CategoryDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (payload: AdminCategoryRequest) => Promise<void>;
    onDelete: (category: AdminCategory) => Promise<void>;
}) {
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

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Kategori</Typography>
                {state.type === "edit" ? "Kategoriyi düzenle" : "Kategori ekle"}
            </DialogTitle>
            <Box
                component="form"
                onSubmit={(event: React.FormEvent) => {
                    event.preventDefault();
                    void onSubmit({ name: form.name.trim(), isActive: form.isActive });
                }}
            >
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

function AuditPanel({ loading, error, items }: { loading: boolean; error: string | null; items: AuditLogItem[] }) {
    const PANEL_SX_LOCAL = {
        borderRadius: "22px",
        overflow: "hidden",
        bgcolor: "rgba(247, 245, 241, 0.92)",
        border: "1px solid",
        borderColor: "rgba(255, 255, 255, 0.72)",
        boxShadow: "0 18px 52px rgba(17, 17, 17, 0.09)",
    };
    return (
        <Paper sx={PANEL_SX_LOCAL}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "20px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>Audit Trail</Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Kategori audit geçmişi</Typography>
                </Box>
                <Typography sx={{ fontWeight: 700 }}>{items.length} kayıt</Typography>
            </Box>
            {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Audit kayıtları yükleniyor...</Typography> : null}
            {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
            {!loading && !error && items.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Audit kaydı bulunamadı.</Typography> : null}
            {!loading && !error && items.length > 0 ? (
                <Box>
                    {items.map((item) => (
                        <Box key={item.id} component="article" sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, px: 2.25, py: 1.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{auditTitle(item)}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                    {`${item.actorUsername ?? "Sistem"} -> ${item.targetId ? `category #${item.targetId}` : "category"}`}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                {formatDateTime(item.createdAt ?? item.timestamp ?? null)}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            ) : null}
        </Paper>
    );
}
