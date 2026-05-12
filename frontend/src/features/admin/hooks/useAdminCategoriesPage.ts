import { useState } from "react";
import { useToast } from "../../../components/ToastContext";
import { createAdminCategory, deleteAdminCategory, updateAdminCategory } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import { useAdminCategories, useFilteredAdminCategories } from "../api/useAdminCategories";
import type { AdminCategory, AdminCategoryRequest, AuditLogItem } from "../types/admin.types";
import { resolveAdminError } from "../utils/adminErrors";

const CATEGORY_AUDIT_TARGETS = ["category"];

export type CategoryDialogState =
    | { type: "create"; category?: undefined }
    | { type: "edit"; category: AdminCategory }
    | { type: "delete"; category: AdminCategory }
    | null;

export function categoryAuditTitle(item: AuditLogItem) {
    const titles: Record<string, string> = {
        CATEGORY_CREATED: "Kategori oluşturuldu",
        CATEGORY_UPDATED: "Kategori güncellendi",
        CATEGORY_DELETED: "Kategori silindi",
    };
    return titles[item.action] ?? item.action;
}

export function categoryAuditDescription(item: AuditLogItem) {
    return `${item.actorUsername ?? "Sistem"} -> ${item.targetId ? `category #${item.targetId}` : "category"}`;
}

export function useAdminCategoriesPage() {
    const { showToast } = useToast();
    const categoriesQuery = useAdminCategories();
    const auditTrail = useAdminAuditLogs(CATEGORY_AUDIT_TARGETS);
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
            showToast(resolveAdminError(caughtError, "Kategori kaydedilemedi."), "error");
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
            showToast(resolveAdminError(caughtError, "Kategori silinemedi."), "error");
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
            showToast(resolveAdminError(caughtError, "Kategori durumu güncellenemedi."), "error");
        } finally {
            setPendingAction(null);
        }
    };

    return {
        categories,
        categoriesQuery,
        auditTrail,
        search,
        dialogs: {
            state: dialog,
            openCreate: () => setDialog({ type: "create" }),
            openEdit: (category: AdminCategory) => setDialog({ type: "edit", category }),
            openDelete: (category: AdminCategory) => setDialog({ type: "delete", category }),
            close: () => setDialog(null),
        },
        handlers: {
            setSearch,
            saveCategory,
            removeCategory,
            toggleCategory,
        },
        pending: {
            action: pendingAction,
            save: pendingAction === "save",
        },
    };
}
