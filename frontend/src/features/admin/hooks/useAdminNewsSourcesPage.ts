import { useState } from "react";
import { useToast } from "../../../components/ToastContext";
import i18n from "../../../i18n";
import {
    createAdminNewsSource,
    deleteAdminNewsSource,
    triggerAdminNewsFetch,
    updateAdminNewsSource,
} from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import { useAdminNewsSources, useFilteredAdminNewsSources } from "../api/useAdminNewsSources";
import type { AdminNewsSource, AdminNewsSourceRequest, AuditLogItem } from "../types/admin.types";
import { resolveAdminError } from "../utils/adminErrors";

const NEWS_AUDIT_TARGETS = ["source", "news"];

export type SourceDialogState =
    | { type: "create"; source?: undefined }
    | { type: "edit"; source: AdminNewsSource }
    | { type: "delete"; source: AdminNewsSource }
    | null;

export function sourceAuditTitle(item: AuditLogItem) {
    const titles: Record<string, string> = {
        SOURCE_CREATED: i18n.t("admin.sources.created"),
        SOURCE_UPDATED: i18n.t("admin.sources.updated"),
        SOURCE_DELETED: i18n.t("admin.sources.deleted"),
        NEWS_FETCH_TRIGGERED: i18n.t("admin.sources.fetchTriggered"),
    };
    return titles[item.action] ?? item.action;
}

export function sourceAuditDescription(item: AuditLogItem) {
    const target = item.targetId ? `${item.targetType} #${item.targetId}` : item.targetType || "sistem";
    return `${item.actorUsername ?? "Sistem"} -> ${target}${item.reason ? `: ${item.reason}` : ""}`;
}

export function useAdminNewsSourcesPage() {
    const { showToast } = useToast();
    const [search, setSearch] = useState("");
    const [dialog, setDialog] = useState<SourceDialogState>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const sourcesQuery = useAdminNewsSources();
    const auditTrail = useAdminAuditLogs(NEWS_AUDIT_TARGETS);
    const sources = useFilteredAdminNewsSources(sourcesQuery.data, search);

    const closeDialog = () => setDialog(null);

    const saveSource = async (payload: AdminNewsSourceRequest) => {
        setPendingAction("source-save");
        try {
            if (dialog?.type === "edit") {
                await updateAdminNewsSource(dialog.source.id, payload);
                showToast(i18n.t("admin.sources.updated"), "success");
            } else {
                await createAdminNewsSource(payload);
                showToast(i18n.t("admin.sources.created"), "success");
            }
            invalidateAdminQuery({ scope: "news-sources" });
            invalidateAdminQuery({ scope: "news-audit" });
            closeDialog();
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, i18n.t("admin.sources.saveError")), "error");
        } finally {
            setPendingAction(null);
        }
    };

    const deleteSource = async (source: AdminNewsSource) => {
        setPendingAction(`delete-${source.id}`);
        try {
            await deleteAdminNewsSource(source.id);
            showToast(i18n.t("admin.sources.deleted"), "success");
            invalidateAdminQuery({ scope: "news-sources" });
            invalidateAdminQuery({ scope: "news-audit" });
            closeDialog();
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, i18n.t("admin.sources.deleteError")), "error");
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
            showToast(resolveAdminError(caughtError, i18n.t("admin.sources.fetchError")), "error");
        } finally {
            setPendingAction(null);
        }
    };

    return {
        sources,
        sourcesQuery,
        auditTrail,
        search,
        dialogs: {
            state: dialog,
            openCreate: () => setDialog({ type: "create" }),
            openEdit: (source: AdminNewsSource) => setDialog({ type: "edit", source }),
            openDelete: (source: AdminNewsSource) => setDialog({ type: "delete", source }),
            close: closeDialog,
        },
        handlers: {
            setSearch,
            saveSource,
            deleteSource,
            triggerFetch,
        },
        pending: {
            action: pendingAction,
            save: pendingAction === "source-save",
        },
    };
}
