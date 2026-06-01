import { useState } from "react";
import { useToast } from "../../../components/ToastContext";
import i18n from "../../../i18n";
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
        CATEGORY_CREATED: i18n.t("admin.categories.created"),
        CATEGORY_UPDATED: i18n.t("admin.categories.updated"),
        CATEGORY_DELETED: i18n.t("admin.categories.deleted"),
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
                showToast(i18n.t("admin.categories.updated"), "success");
            } else {
                await createAdminCategory(payload);
                showToast(i18n.t("admin.categories.created"), "success");
            }
            refreshAfterMutation();
            setDialog(null);
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, i18n.t("admin.categories.saveError")), "error");
        } finally {
            setPendingAction(null);
        }
    };

    const removeCategory = async (category: AdminCategory) => {
        setPendingAction(`delete-${category.id}`);
        try {
            await deleteAdminCategory(category.id);
            showToast(i18n.t("admin.categories.deleted"), "success");
            refreshAfterMutation();
            setDialog(null);
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, i18n.t("admin.categories.deleteError")), "error");
        } finally {
            setPendingAction(null);
        }
    };

    const toggleCategory = async (category: AdminCategory) => {
        setPendingAction(`toggle-${category.id}`);
        try {
            await updateAdminCategory(category.id, { name: category.name, isActive: !category.active });
            showToast(category.active ? i18n.t("admin.categories.deactivated") : i18n.t("admin.categories.activated"), "success");
            refreshAfterMutation();
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, i18n.t("admin.categories.statusError")), "error");
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
