import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../../api/client";
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
    const auditQuery = useAdminAuditLogs(NEWS_AUDIT_TARGETS, "news-audit");
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
        <section className="admin-page">
            <div className="admin-panel">
                <div className="admin-panel-head">
                    <div>
                        <span>RSS Source Management</span>
                        <h2>RSS Kaynakları</h2>
                    </div>
                    <div className="admin-detail-actions">
                        <button type="button" className="admin-secondary-btn" disabled={pendingAction === "fetch-all"} onClick={() => void triggerFetch()}>
                            Tümünden çek
                        </button>
                        <button type="button" className="admin-primary-btn" onClick={() => setDialog({ type: "create" })}>
                            Kaynak ekle
                        </button>
                    </div>
                </div>
                <div className="admin-filter-bar compact">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kaynak adı veya RSS URL ara" />
                    <strong>{sources.length} kaynak</strong>
                </div>

                {sourcesQuery.loading ? <div className="admin-empty">RSS kaynakları yükleniyor...</div> : null}
                {!sourcesQuery.loading && sourcesQuery.error ? <div className="admin-error">{sourcesQuery.error}</div> : null}
                {!sourcesQuery.loading && !sourcesQuery.error && sources.length === 0 ? <div className="admin-empty">Bu filtrede kaynak yok.</div> : null}

                {!sourcesQuery.loading && !sourcesQuery.error && sources.length > 0 ? (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Kaynak</th>
                                    <th>RSS URL</th>
                                    <th>Durum</th>
                                    <th>Güncelleme</th>
                                    <th>Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sources.map((source) => (
                                    <tr key={source.id}>
                                        <td><strong>{source.name}</strong></td>
                                        <td><a className="admin-link" href={source.sourceUrl} target="_blank" rel="noreferrer">{source.sourceUrl}</a></td>
                                        <td><span className={`admin-pill status-${source.active ? "active" : "passive"}`}>{source.active ? "Aktif" : "Pasif"}</span></td>
                                        <td>{formatDateTime(source.updatedAt ?? source.createdAt)}</td>
                                        <td>
                                            <div className="admin-row-actions">
                                                <button type="button" disabled={pendingAction === `fetch-${source.id}`} onClick={() => void triggerFetch(source)}>Çek</button>
                                                <button type="button" onClick={() => setDialog({ type: "edit", source })}>Düzenle</button>
                                                <button type="button" onClick={() => setDialog({ type: "delete", source })}>Sil</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

            <AuditPanel
                title="RSS ve haber audit geçmişi"
                loading={auditQuery.loading}
                error={auditQuery.error}
                items={auditQuery.data}
            />

            <SourceDialog state={dialog} pending={pendingAction === "source-save"} onClose={closeDialog} onSubmit={saveSource} onDelete={deleteSource} />
        </section>
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

    if (!state) return null;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void onSubmit({
            name: form.name.trim(),
            sourceUrl: form.sourceUrl.trim(),
        });
    };

    if (state.type === "delete") {
        return (
            <div className="admin-modal-backdrop" role="presentation">
                <section className="admin-modal" role="dialog" aria-modal="true">
                    <div className="admin-modal-head">
                        <div>
                            <span>RSS Kaynağı</span>
                            <h2>Kaynağı sil</h2>
                        </div>
                        <button type="button" onClick={onClose}>×</button>
                    </div>
                    <p className="admin-dialog-warning">{state.source.name} kaynağı silinecek.</p>
                    <div className="admin-dialog-actions">
                        <button type="button" className="admin-secondary-btn" onClick={onClose}>Vazgeç</button>
                        <button type="button" className="admin-danger-btn" onClick={() => void onDelete(state.source)}>Sil</button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="admin-modal-backdrop" role="presentation">
            <section className="admin-modal" role="dialog" aria-modal="true">
                <div className="admin-modal-head">
                    <div>
                        <span>RSS Kaynağı</span>
                        <h2>{state.type === "edit" ? "Kaynağı düzenle" : "Kaynak ekle"}</h2>
                    </div>
                    <button type="button" onClick={onClose}>×</button>
                </div>
                <form className="admin-dialog-form" onSubmit={submit}>
                    <label>
                        Kaynak adı
                        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                    </label>
                    <label>
                        RSS URL
                        <input value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} required />
                    </label>
                    <div className="admin-dialog-actions">
                        <button type="button" className="admin-secondary-btn" onClick={onClose}>Vazgeç</button>
                        <button type="submit" className="admin-primary-btn" disabled={pending}>{pending ? "Kaydediliyor..." : "Kaydet"}</button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function AuditPanel({ title, loading, error, items }: { title: string; loading: boolean; error: string | null; items: AuditLogItem[] }) {
    return (
        <div className="admin-panel">
            <div className="admin-panel-head">
                <div>
                    <span>Audit Trail</span>
                    <h2>{title}</h2>
                </div>
                <strong>{items.length} kayıt</strong>
            </div>
            {loading ? <div className="admin-empty">Audit kayıtları yükleniyor...</div> : null}
            {!loading && error ? <div className="admin-error">{error}</div> : null}
            {!loading && !error && items.length === 0 ? <div className="admin-empty">Audit kaydı bulunamadı.</div> : null}
            {!loading && !error && items.length > 0 ? (
                <div className="admin-audit-list">
                    {items.map((item) => (
                        <article key={item.id}>
                            <div>
                                <strong>{auditTitle(item)}</strong>
                                <span>{auditDescription(item)}</span>
                            </div>
                            <time>{formatDateTime(item.createdAt ?? item.timestamp ?? null)}</time>
                        </article>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
