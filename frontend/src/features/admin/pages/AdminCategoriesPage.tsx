import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError } from "../../../api/client";
import { useToast } from "../../../components/ToastContext";
import { createAdminCategory, deleteAdminCategory, updateAdminCategory } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import { useAdminCategories, useFilteredAdminCategories } from "../api/useAdminCategories";
import type { AdminCategory, AdminCategoryRequest, AuditLogItem } from "../types/admin.types";

const CATEGORY_AUDIT_TARGETS = ["category"];

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
    const auditQuery = useAdminAuditLogs(CATEGORY_AUDIT_TARGETS, "category-audit");
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
        <section className="admin-page">
            <div className="admin-panel">
                <div className="admin-panel-head">
                    <div>
                        <span>Category Management</span>
                        <h2>Kategori Yönetimi</h2>
                    </div>
                    <button type="button" className="admin-primary-btn" onClick={() => setDialog({ type: "create" })}>Kategori ekle</button>
                </div>
                <div className="admin-filter-bar compact">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kategori ara" />
                    <strong>{categories.length} kategori</strong>
                </div>

                {categoriesQuery.loading ? <div className="admin-empty">Kategoriler yükleniyor...</div> : null}
                {!categoriesQuery.loading && categoriesQuery.error ? <div className="admin-error">{categoriesQuery.error}</div> : null}
                {!categoriesQuery.loading && !categoriesQuery.error && categories.length === 0 ? <div className="admin-empty">Bu filtrede kategori yok.</div> : null}

                {!categoriesQuery.loading && !categoriesQuery.error && categories.length > 0 ? (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Kategori</th>
                                    <th>Durum</th>
                                    <th>Oluşturma</th>
                                    <th>Güncelleme</th>
                                    <th>Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id}>
                                        <td><strong>{category.name}</strong></td>
                                        <td><span className={`admin-pill status-${category.active ? "active" : "passive"}`}>{category.active ? "Aktif" : "Pasif"}</span></td>
                                        <td>{formatDateTime(category.createdAt)}</td>
                                        <td>{formatDateTime(category.updatedAt)}</td>
                                        <td>
                                            <div className="admin-row-actions">
                                                <button type="button" disabled={pendingAction === `toggle-${category.id}`} onClick={() => void toggleCategory(category)}>
                                                    {category.active ? "Pasifleştir" : "Aktifleştir"}
                                                </button>
                                                <button type="button" onClick={() => setDialog({ type: "edit", category })}>Düzenle</button>
                                                <button type="button" onClick={() => setDialog({ type: "delete", category })}>Sil</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

            <AuditPanel loading={auditQuery.loading} error={auditQuery.error} items={auditQuery.data} />
            <CategoryDialog state={dialog} pending={pendingAction === "save"} onClose={() => setDialog(null)} onSubmit={saveCategory} onDelete={removeCategory} />
        </section>
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

    if (!state) return null;

    if (state.type === "delete") {
        return (
            <div className="admin-modal-backdrop" role="presentation">
                <section className="admin-modal" role="dialog" aria-modal="true">
                    <div className="admin-modal-head">
                        <div>
                            <span>Kategori</span>
                            <h2>Kategoriyi sil</h2>
                        </div>
                        <button type="button" onClick={onClose}>×</button>
                    </div>
                    <p className="admin-dialog-warning">{state.category.name} kategorisi silinecek.</p>
                    <div className="admin-dialog-actions">
                        <button type="button" className="admin-secondary-btn" onClick={onClose}>Vazgeç</button>
                        <button type="button" className="admin-danger-btn" onClick={() => void onDelete(state.category)}>Sil</button>
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
                        <span>Kategori</span>
                        <h2>{state.type === "edit" ? "Kategoriyi düzenle" : "Kategori ekle"}</h2>
                    </div>
                    <button type="button" onClick={onClose}>×</button>
                </div>
                <form className="admin-dialog-form" onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    void onSubmit({ name: form.name.trim(), isActive: form.isActive });
                }}>
                    <label>
                        Kategori adı
                        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                    </label>
                    <label className="admin-checkbox-inline">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                        />
                        Aktif
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

function AuditPanel({ loading, error, items }: { loading: boolean; error: string | null; items: AuditLogItem[] }) {
    return (
        <div className="admin-panel">
            <div className="admin-panel-head">
                <div>
                    <span>Audit Trail</span>
                    <h2>Kategori audit geçmişi</h2>
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
                                <span>{`${item.actorUsername ?? "Sistem"} -> ${item.targetId ? `category #${item.targetId}` : "category"}`}</span>
                            </div>
                            <time>{formatDateTime(item.createdAt ?? item.timestamp ?? null)}</time>
                        </article>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
