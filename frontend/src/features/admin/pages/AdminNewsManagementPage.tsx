import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
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
    FormControl,
    FormControlLabel,
    NativeSelect,
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
import { updateAdminNewsCategories, updateAdminNewsStatus } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import { useAdminCategories } from "../api/useAdminCategories";
import { useAdminNews } from "../api/useAdminNews";
import { useAdminNewsSources } from "../api/useAdminNewsSources";
import type { AdminCategory, AdminNewsQuery, AdminNewsStatus, AdminNewsSummary, AuditLogItem } from "../types/admin.types";

const NEWS_AUDIT_TARGETS = ["news"];
const NEWS_STATUSES: AdminNewsStatus[] = ["published", "archived", "removed"];

const PANEL_SX = {
    borderRadius: "22px",
    overflow: "hidden",
    bgcolor: "rgba(247, 245, 241, 0.92)",
    border: "1px solid",
    borderColor: "rgba(255, 255, 255, 0.72)",
    boxShadow: "0 18px 52px rgba(17, 17, 17, 0.09)",
} as const;

const STATUS_COLORS: Record<AdminNewsStatus, { bgcolor: string; color: string }> = {
    published: { bgcolor: "rgba(46, 164, 79, 0.12)", color: "#1a7a35" },
    archived: { bgcolor: "rgba(100, 100, 100, 0.12)", color: "#555" },
    removed: { bgcolor: "rgba(220, 53, 69, 0.12)", color: "#9e1818" },
};

type NewsDialogState =
    | { type: "status"; news: AdminNewsSummary }
    | { type: "categories"; news: AdminNewsSummary }
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

function statusLabel(status: AdminNewsStatus) {
    if (status === "archived") return "Arşiv";
    if (status === "removed") return "Kaldırıldı";
    return "Yayında";
}

function readQuery(params: URLSearchParams): AdminNewsQuery {
    const status = params.get("status");
    return {
        search: params.get("search") ?? "",
        status: status === "published" || status === "archived" || status === "removed" ? status : "",
        sourceId: Number(params.get("sourceId")) > 0 ? Number(params.get("sourceId")) : "",
        categoryId: Number(params.get("categoryId")) > 0 ? Number(params.get("categoryId")) : "",
        page: Math.max(0, Number(params.get("page") ?? 0) || 0),
        size: [10, 20, 50].includes(Number(params.get("size"))) ? Number(params.get("size")) : 20,
    };
}

function auditTitle(item: AuditLogItem) {
    const titles: Record<string, string> = {
        NEWS_STATUS_CHANGED: "Haber durumu değişti",
        NEWS_CATEGORY_OVERRIDDEN: "Haber kategorileri değişti",
        NEWS_FETCH_TRIGGERED: "Haber çekimi tetiklendi",
    };
    return titles[item.action] ?? item.action;
}

export function AdminNewsManagementPage() {
    const { showToast } = useToast();
    const [params, setParams] = useSearchParams();
    const query = useMemo(() => readQuery(params), [params]);
    const newsQuery = useAdminNews(query);
    const categoriesQuery = useAdminCategories();
    const sourcesQuery = useAdminNewsSources();
    const auditQuery = useAdminAuditLogs(NEWS_AUDIT_TARGETS);
    const [dialog, setDialog] = useState<NewsDialogState>(null);
    const [pending, setPending] = useState(false);

    const updateFilter = (key: keyof AdminNewsQuery, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.set("page", "0");
        setParams(next, { replace: true });
    };

    const refreshAfterMutation = () => {
        invalidateAdminQuery({ scope: "news-list" });
        invalidateAdminQuery({ scope: "news-audit" });
    };

    const submitStatus = async (news: AdminNewsSummary, status: AdminNewsStatus) => {
        setPending(true);
        try {
            await updateAdminNewsStatus(news.id, status);
            showToast("Haber durumu güncellendi.", "success");
            refreshAfterMutation();
            setDialog(null);
        } catch (caughtError) {
            showToast(resolveError(caughtError, "Haber durumu güncellenemedi."), "error");
        } finally {
            setPending(false);
        }
    };

    const submitCategories = async (news: AdminNewsSummary, categoryIds: number[]) => {
        if (categoryIds.length === 0) {
            showToast("En az bir kategori seçilmelidir.", "error");
            return;
        }
        setPending(true);
        try {
            await updateAdminNewsCategories(news.id, categoryIds);
            showToast("Haber kategorileri güncellendi.", "success");
            refreshAfterMutation();
            setDialog(null);
        } catch (caughtError) {
            showToast(resolveError(caughtError, "Haber kategorileri güncellenemedi."), "error");
        } finally {
            setPending(false);
        }
    };

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Paper sx={PANEL_SX}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "20px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                    <Box>
                        <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>News Management</Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Haber Yönetimi</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>{newsQuery.data.totalElements} haber</Typography>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr repeat(4, 160px)", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                    <TextField
                        size="small"
                        value={query.search}
                        onChange={(event) => updateFilter("search", event.target.value)}
                        placeholder="Başlık, içerik veya URL ara"
                    />
                    <FormControl size="small">
                        <NativeSelect value={query.status} onChange={(event) => updateFilter("status", event.target.value)}>
                            <option value="">Tüm durumlar</option>
                            {NEWS_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <FormControl size="small">
                        <NativeSelect value={query.sourceId} onChange={(event) => updateFilter("sourceId", event.target.value)}>
                            <option value="">Tüm kaynaklar</option>
                            {sourcesQuery.data.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <FormControl size="small">
                        <NativeSelect value={query.categoryId} onChange={(event) => updateFilter("categoryId", event.target.value)}>
                            <option value="">Tüm kategoriler</option>
                            {categoriesQuery.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </NativeSelect>
                    </FormControl>
                    <FormControl size="small">
                        <NativeSelect value={query.size} onChange={(event) => updateFilter("size", event.target.value)}>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </NativeSelect>
                    </FormControl>
                </Box>

                {newsQuery.loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Haberler yükleniyor...</Typography> : null}
                {!newsQuery.loading && newsQuery.error ? <Alert severity="error" sx={{ m: 2 }}>{newsQuery.error}</Alert> : null}
                {!newsQuery.loading && !newsQuery.error && newsQuery.data.content.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Bu filtrede haber yok.</Typography> : null}

                {!newsQuery.loading && !newsQuery.error && newsQuery.data.content.length > 0 ? (
                    <>
                        <TableContainer sx={{ overflowX: "auto" }}>
                            <Table size="small" sx={{ minWidth: 900 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Haber</TableCell>
                                        <TableCell>Kaynak</TableCell>
                                        <TableCell>Kategoriler</TableCell>
                                        <TableCell>Durum</TableCell>
                                        <TableCell>Yayın</TableCell>
                                        <TableCell>Aksiyon</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {newsQuery.data.content.map((news) => (
                                        <TableRow key={news.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                            <TableCell sx={{ maxWidth: 380 }}>
                                                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, minWidth: 300 }}>
                                                    {news.imageUrl ? (
                                                        <Box
                                                            component="img"
                                                            src={news.imageUrl}
                                                            alt=""
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer"
                                                            onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                                                                event.currentTarget.hidden = true;
                                                            }}
                                                            sx={{ width: 74, height: 54, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider", flexShrink: 0 }}
                                                        />
                                                    ) : null}
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {news.title}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {news.canonicalUrl ?? "-"}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{news.source?.name ?? "-"}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                                                    {news.categories.length > 0 ? news.categories.map((category) => (
                                                        <Chip
                                                            key={category.id}
                                                            size="small"
                                                            label={category.name}
                                                            sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: "rgba(17,17,17,0.07)" }}
                                                        />
                                                    )) : "-"}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={statusLabel(news.status)}
                                                    sx={{
                                                        height: 22,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        ...STATUS_COLORS[news.status],
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{formatDateTime(news.publishedAt)}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                                    <Button size="small" variant="outlined" onClick={() => setDialog({ type: "status", news })}>Durum</Button>
                                                    <Button size="small" variant="outlined" onClick={() => setDialog({ type: "categories", news })}>Kategori</Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Pagination
                            page={query.page}
                            totalPages={newsQuery.data.totalPages}
                            onPage={(page) => updateFilter("page", String(page))}
                        />
                    </>
                ) : null}
            </Paper>

            <AuditPanel loading={auditQuery.loading} error={auditQuery.error} items={auditQuery.data} />
            <StatusDialog state={dialog} pending={pending} onClose={() => setDialog(null)} onSubmit={submitStatus} />
            <CategoryOverrideDialog state={dialog} categories={categoriesQuery.data} pending={pending} onClose={() => setDialog(null)} onSubmit={submitCategories} />
        </Box>
    );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1.25, p: "16px 22px" }}>
            <Button variant="outlined" size="small" disabled={page <= 0} onClick={() => onPage(page - 1)}>Önceki</Button>
            <Typography variant="body2">{totalPages === 0 ? 0 : page + 1} / {totalPages}</Typography>
            <Button variant="outlined" size="small" disabled={totalPages === 0 || page >= totalPages - 1} onClick={() => onPage(page + 1)}>Sonraki</Button>
        </Box>
    );
}

function StatusDialog({ state, pending, onClose, onSubmit }: {
    state: NewsDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (news: AdminNewsSummary, status: AdminNewsStatus) => Promise<void>;
}) {
    const [status, setStatus] = useState<AdminNewsStatus>(state?.type === "status" ? state.news.status : "published");
    useEffect(() => {
        setStatus(state?.type === "status" ? state.news.status : "published");
    }, [state]);
    if (state?.type !== "status") return null;
    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Haber</Typography>
                Durum değiştir
            </DialogTitle>
            <Box component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void onSubmit(state.news, status); }}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <NativeSelect value={status} onChange={(event) => setStatus(event.target.value as AdminNewsStatus)}>
                            {NEWS_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
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

function CategoryOverrideDialog({ state, categories, pending, onClose, onSubmit }: {
    state: NewsDialogState;
    categories: AdminCategory[];
    pending: boolean;
    onClose: () => void;
    onSubmit: (news: AdminNewsSummary, categoryIds: number[]) => Promise<void>;
}) {
    const initialIds = state?.type === "categories" ? state.news.categories.map((category) => category.id) : [];
    const [selectedIds, setSelectedIds] = useState<number[]>(initialIds);
    useEffect(() => {
        setSelectedIds(initialIds);
    }, [state]);
    if (state?.type !== "categories") return null;
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
            <Box component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void onSubmit(state.news, selectedIds); }}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ maxHeight: 280, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: "14px", p: 1.5, display: "flex", flexDirection: "column" }}>
                        {categories.filter((category) => category.active).map((category) => (
                            <FormControlLabel
                                key={category.id}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={selectedIds.includes(category.id)}
                                        onChange={() => toggle(category.id)}
                                    />
                                }
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

function AuditPanel({ loading, error, items }: { loading: boolean; error: string | null; items: AuditLogItem[] }) {
    return (
        <Paper sx={{ borderRadius: "22px", overflow: "hidden", bgcolor: "rgba(247, 245, 241, 0.92)", border: "1px solid", borderColor: "rgba(255, 255, 255, 0.72)", boxShadow: "0 18px 52px rgba(17, 17, 17, 0.09)" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "20px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>Audit Trail</Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Haber audit geçmişi</Typography>
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
                                    {`${item.actorUsername ?? "Sistem"} -> ${item.targetId ? `news #${item.targetId}` : "news"}`}
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
