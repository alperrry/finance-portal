import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Link,
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
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import { useAdminNewsSources, useFilteredAdminNewsSources } from "../api/useAdminNewsSources";
import {
    createAdminNewsSource,
    deleteAdminNewsSource,
    triggerAdminNewsFetch,
    updateAdminNewsSource,
} from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import type { AdminNewsSource, AdminNewsSourceRequest, AuditLogItem } from "../types/admin.types";

const NEWS_AUDIT_TARGETS = ["source", "news"];

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

type SourceDialogState =
    | { type: "create"; source?: undefined }
    | { type: "edit"; source: AdminNewsSource }
    | { type: "delete"; source: AdminNewsSource }
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
        SOURCE_CREATED: "Kaynak oluşturuldu",
        SOURCE_UPDATED: "Kaynak güncellendi",
        SOURCE_DELETED: "Kaynak silindi",
        NEWS_FETCH_TRIGGERED: "Haber çekimi tetiklendi",
    };
    return titles[item.action] ?? item.action;
}

function auditDescription(item: AuditLogItem) {
    const target = item.targetId ? `${item.targetType} #${item.targetId}` : item.targetType || "sistem";
    return `${item.actorUsername ?? "Sistem"} -> ${target}${item.reason ? `: ${item.reason}` : ""}`;
}

export function AdminNewsSourcesPage() {
    const { showToast } = useToast();
    const [search, setSearch] = useState("");
    const [dialog, setDialog] = useState<SourceDialogState>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const sourcesQuery = useAdminNewsSources();
    const auditQuery = useAdminAuditLogs(NEWS_AUDIT_TARGETS);
    const sources = useFilteredAdminNewsSources(sourcesQuery.data, search);

    const closeDialog = () => setDialog(null);

    const saveSource = async (payload: AdminNewsSourceRequest) => {
        setPendingAction("source-save");
        try {
            if (dialog?.type === "edit") {
                await updateAdminNewsSource(dialog.source.id, payload);
                showToast("RSS kaynağı güncellendi.", "success");
            } else {
                await createAdminNewsSource(payload);
                showToast("RSS kaynağı oluşturuldu.", "success");
            }
            invalidateAdminQuery({ scope: "news-sources" });
            invalidateAdminQuery({ scope: "news-audit" });
            closeDialog();
        } catch (caughtError) {
            showToast(resolveError(caughtError, "RSS kaynağı kaydedilemedi."), "error");
        } finally {
            setPendingAction(null);
        }
    };

    const deleteSource = async (source: AdminNewsSource) => {
        setPendingAction(`delete-${source.id}`);
        try {
            await deleteAdminNewsSource(source.id);
            showToast("RSS kaynağı silindi.", "success");
            invalidateAdminQuery({ scope: "news-sources" });
            invalidateAdminQuery({ scope: "news-audit" });
            closeDialog();
        } catch (caughtError) {
            showToast(resolveError(caughtError, "RSS kaynağı silinemedi."), "error");
        } finally {
            setPendingAction(null);
        }
    };

    const triggerFetch = async (source?: AdminNewsSource) => {
        const actionKey = source ? `fetch-${source.id}` : "fetch-all";
        setPendingAction(actionKey);
        try {
            const response = await triggerAdminNewsFetch(source?.id);
            showToast(response.message, response.status === "ALREADY_RUNNING" ? "info" : "success");
            invalidateAdminQuery({ scope: "news-audit" });
        } catch (caughtError) {
            showToast(resolveError(caughtError, "Haber çekimi başlatılamadı."), "error");
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Paper sx={PANEL_SX}>
                <Box sx={PANEL_HEAD_SX}>
                    <Box>
                        <Typography sx={KICKER_SX}>RSS Source Management</Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>RSS Kaynakları</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={pendingAction === "fetch-all"}
                            onClick={() => void triggerFetch()}
                        >
                            Tümünden çek
                        </Button>
                        <Button variant="contained" color="secondary" size="small" onClick={() => setDialog({ type: "create" })}>
                            Kaynak ekle
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider", alignItems: "center" }}>
                    <TextField
                        size="small"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Kaynak adı veya RSS URL ara"
                    />
                    <Typography sx={{ fontWeight: 700 }}>{sources.length} kaynak</Typography>
                </Box>

                {sourcesQuery.loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>RSS kaynakları yükleniyor...</Typography> : null}
                {!sourcesQuery.loading && sourcesQuery.error ? <Alert severity="error" sx={{ m: 2 }}>{sourcesQuery.error}</Alert> : null}
                {!sourcesQuery.loading && !sourcesQuery.error && sources.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Bu filtrede kaynak yok.</Typography> : null}

                {!sourcesQuery.loading && !sourcesQuery.error && sources.length > 0 ? (
                    <TableContainer sx={{ overflowX: "auto" }}>
                        <Table size="small" sx={{ minWidth: 720 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Kaynak</TableCell>
                                    <TableCell>RSS URL</TableCell>
                                    <TableCell>Durum</TableCell>
                                    <TableCell>Güncelleme</TableCell>
                                    <TableCell>Aksiyon</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sources.map((source) => (
                                    <TableRow key={source.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{source.name}</Typography></TableCell>
                                        <TableCell sx={{ maxWidth: 320 }}>
                                            <Link href={source.sourceUrl} target="_blank" rel="noreferrer" color="secondary" variant="body2" sx={{ wordBreak: "break-all" }}>
                                                {source.sourceUrl}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={source.active ? "Aktif" : "Pasif"}
                                                sx={{
                                                    height: 22,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    bgcolor: source.active ? "rgba(46, 164, 79, 0.12)" : "rgba(220, 53, 69, 0.12)",
                                                    color: source.active ? "#1a7a35" : "#9e1818",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{formatDateTime(source.updatedAt ?? source.createdAt)}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    disabled={pendingAction === `fetch-${source.id}`}
                                                    onClick={() => void triggerFetch(source)}
                                                >
                                                    Çek
                                                </Button>
                                                <Button size="small" variant="outlined" onClick={() => setDialog({ type: "edit", source })}>Düzenle</Button>
                                                <Button size="small" variant="outlined" color="error" onClick={() => setDialog({ type: "delete", source })}>Sil</Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : null}
            </Paper>

            <AuditPanel
                title="RSS ve haber audit geçmişi"
                loading={auditQuery.loading}
                error={auditQuery.error}
                items={auditQuery.data}
            />

            <SourceDialog
                state={dialog}
                pending={pendingAction === "source-save"}
                onClose={closeDialog}
                onSubmit={saveSource}
                onDelete={deleteSource}
            />
        </Box>
    );
}

function SourceDialog({
    state,
    pending,
    onClose,
    onSubmit,
    onDelete,
}: {
    state: SourceDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (payload: AdminNewsSourceRequest) => Promise<void>;
    onDelete: (source: AdminNewsSource) => Promise<void>;
}) {
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

function AuditPanel({ title, loading, error, items }: { title: string; loading: boolean; error: string | null; items: AuditLogItem[] }) {
    return (
        <Paper sx={{ borderRadius: "22px", overflow: "hidden", bgcolor: "rgba(247, 245, 241, 0.92)", border: "1px solid", borderColor: "rgba(255, 255, 255, 0.72)", boxShadow: "0 18px 52px rgba(17, 17, 17, 0.09)" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "20px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>Audit Trail</Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>{title}</Typography>
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
                                    {auditDescription(item)}
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
