import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../../api/client";
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
    const auditQuery = useAdminAuditLogs(NEWS_AUDIT_TARGETS, "news-audit");
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
        <section className="admin-page">
            <div className="admin-panel">
                <div className="admin-panel-head">
                    <div>
                        <span>News Management</span>
                        <h2>Haber Yönetimi</h2>
                    </div>
                    <strong>{newsQuery.data.totalElements} haber</strong>
                </div>
                <div className="admin-filter-bar news">
                    <input value={query.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Başlık, içerik veya URL ara" />
                    <select value={query.status} onChange={(event) => updateFilter("status", event.target.value)}>
                        <option value="">Tüm durumlar</option>
                        {NEWS_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                    <select value={query.sourceId} onChange={(event) => updateFilter("sourceId", event.target.value)}>
                        <option value="">Tüm kaynaklar</option>
                        {sourcesQuery.data.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
                    </select>
                    <select value={query.categoryId} onChange={(event) => updateFilter("categoryId", event.target.value)}>
                        <option value="">Tüm kategoriler</option>
                        {categoriesQuery.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <select value={query.size} onChange={(event) => updateFilter("size", event.target.value)}>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>

                {newsQuery.loading ? <div className="admin-empty">Haberler yükleniyor...</div> : null}
                {!newsQuery.loading && newsQuery.error ? <div className="admin-error">{newsQuery.error}</div> : null}
                {!newsQuery.loading && !newsQuery.error && newsQuery.data.content.length === 0 ? <div className="admin-empty">Bu filtrede haber yok.</div> : null}

                {!newsQuery.loading && !newsQuery.error && newsQuery.data.content.length > 0 ? (
                    <>
                        <div className="admin-table-wrap">
                            <table className="admin-table admin-news-table">
                                <thead>
                                    <tr>
                                        <th>Haber</th>
                                        <th>Kaynak</th>
                                        <th>Kategoriler</th>
                                        <th>Durum</th>
                                        <th>Yayın</th>
                                        <th>Aksiyon</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {newsQuery.data.content.map((news) => (
                                        <tr key={news.id}>
                                            <td>
                                                <div className="admin-news-cell">
                                                    {news.imageUrl ? (
                                                        <img
                                                            className="admin-news-thumb"
                                                            src={news.imageUrl}
                                                            alt=""
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer"
                                                            onError={(event) => {
                                                                event.currentTarget.hidden = true;
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className="admin-news-title">
                                                        <strong>{news.title}</strong>
                                                        <small>{news.canonicalUrl ?? "-"}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{news.source?.name ?? "-"}</td>
                                            <td>
                                                <div className="admin-pill-row">
                                                    {news.categories.length > 0 ? news.categories.map((category) => (
                                                        <span className="admin-pill" key={category.id}>{category.name}</span>
                                                    )) : "-"}
                                                </div>
                                            </td>
                                            <td><span className={`admin-pill status-${news.status}`}>{statusLabel(news.status)}</span></td>
                                            <td>{formatDateTime(news.publishedAt)}</td>
                                            <td>
                                                <div className="admin-row-actions">
                                                    <button type="button" onClick={() => setDialog({ type: "status", news })}>Durum</button>
                                                    <button type="button" onClick={() => setDialog({ type: "categories", news })}>Kategori</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination page={query.page} totalPages={newsQuery.data.totalPages} onPage={(page) => updateFilter("page", String(page))} />
                    </>
                ) : null}
            </div>

            <AuditPanel loading={auditQuery.loading} error={auditQuery.error} items={auditQuery.data} />
            <StatusDialog state={dialog} pending={pending} onClose={() => setDialog(null)} onSubmit={submitStatus} />
            <CategoryOverrideDialog state={dialog} categories={categoriesQuery.data} pending={pending} onClose={() => setDialog(null)} onSubmit={submitCategories} />
        </section>
    );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
    return (
        <div className="admin-pagination">
            <button type="button" className="admin-secondary-btn" disabled={page <= 0} onClick={() => onPage(page - 1)}>Önceki</button>
            <span>{totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
            <button type="button" className="admin-secondary-btn" disabled={totalPages === 0 || page >= totalPages - 1} onClick={() => onPage(page + 1)}>Sonraki</button>
        </div>
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
        <div className="admin-modal-backdrop" role="presentation">
            <section className="admin-modal" role="dialog" aria-modal="true">
                <div className="admin-modal-head">
                    <div>
                        <span>Haber</span>
                        <h2>Durum değiştir</h2>
                    </div>
                    <button type="button" onClick={onClose}>×</button>
                </div>
                <form className="admin-dialog-form" onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    void onSubmit(state.news, status);
                }}>
                    <label>
                        Durum
                        <select value={status} onChange={(event) => setStatus(event.target.value as AdminNewsStatus)}>
                            {NEWS_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                        </select>
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
        <div className="admin-modal-backdrop" role="presentation">
            <section className="admin-modal" role="dialog" aria-modal="true">
                <div className="admin-modal-head">
                    <div>
                        <span>Haber</span>
                        <h2>Kategorileri düzenle</h2>
                    </div>
                    <button type="button" onClick={onClose}>×</button>
                </div>
                <form className="admin-dialog-form" onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    void onSubmit(state.news, selectedIds);
                }}>
                    <div className="admin-checkbox-list">
                        {categories.filter((category) => category.active).map((category) => (
                            <label key={category.id}>
                                <input type="checkbox" checked={selectedIds.includes(category.id)} onChange={() => toggle(category.id)} />
                                {category.name}
                            </label>
                        ))}
                    </div>
                    <div className="admin-dialog-actions">
                        <button type="button" className="admin-secondary-btn" onClick={onClose}>Vazgeç</button>
                        <button type="submit" className="admin-primary-btn" disabled={pending || selectedIds.length === 0}>{pending ? "Kaydediliyor..." : "Kaydet"}</button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function AuditPanel({ loading, error, items }: { loading: boolean; error: string | null; items: AuditLogItem[] }) {
    return (
        <div className="admin-panel">
            <div className="admin-panel-head">
                <div>
                    <span>Audit Trail</span>
                    <h2>Haber audit geçmişi</h2>
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
                                <span>{`${item.actorUsername ?? "Sistem"} -> ${item.targetId ? `news #${item.targetId}` : "news"}`}</span>
                            </div>
                            <time>{formatDateTime(item.createdAt ?? item.timestamp ?? null)}</time>
                        </article>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
