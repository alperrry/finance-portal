import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../../../components/ToastContext";
import { updateAdminNewsCategories, updateAdminNewsStatus } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import { useAdminCategories } from "../api/useAdminCategories";
import { useAdminNews } from "../api/useAdminNews";
import { useAdminNewsSources } from "../api/useAdminNewsSources";
import type { AdminNewsQuery, AdminNewsStatus, AdminNewsSummary, AuditLogItem } from "../types/admin.types";
import { resolveAdminError } from "../utils/adminErrors";

const NEWS_AUDIT_TARGETS = ["news"];

export type NewsDialogState =
    | { type: "status"; news: AdminNewsSummary }
    | { type: "categories"; news: AdminNewsSummary }
    | null;

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

export function newsAuditTitle(item: AuditLogItem) {
    const titles: Record<string, string> = {
        NEWS_STATUS_CHANGED: "Haber durumu değişti",
        NEWS_CATEGORY_OVERRIDDEN: "Haber kategorileri değişti",
        NEWS_FETCH_TRIGGERED: "Haber çekimi tetiklendi",
    };
    return titles[item.action] ?? item.action;
}

export function newsAuditDescription(item: AuditLogItem) {
    return `${item.actorUsername ?? "Sistem"} -> ${item.targetId ? `news #${item.targetId}` : "news"}`;
}

export function useAdminNewsManagementPage() {
    const { showToast } = useToast();
    const [params, setParams] = useSearchParams();
    const query = useMemo(() => readQuery(params), [params]);
    const newsQuery = useAdminNews(query);
    const categoriesQuery = useAdminCategories();
    const sourcesQuery = useAdminNewsSources();
    const auditTrail = useAdminAuditLogs(NEWS_AUDIT_TARGETS);
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
            showToast(resolveAdminError(caughtError, "Haber durumu güncellenemedi."), "error");
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
            showToast(resolveAdminError(caughtError, "Haber kategorileri güncellenemedi."), "error");
        } finally {
            setPending(false);
        }
    };

    return {
        query,
        newsQuery,
        categoriesQuery,
        sourcesQuery,
        auditTrail,
        dialogs: {
            state: dialog,
            openStatus: (news: AdminNewsSummary) => setDialog({ type: "status", news }),
            openCategories: (news: AdminNewsSummary) => setDialog({ type: "categories", news }),
            close: () => setDialog(null),
        },
        handlers: {
            updateFilter,
            submitStatus,
            submitCategories,
        },
        pending,
    };
}
