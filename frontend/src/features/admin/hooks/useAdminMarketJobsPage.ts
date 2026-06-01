import { useState } from "react";
import { useToast } from "../../../components/ToastContext";
import i18n from "../../../i18n";
import { clearAdminMarketData, triggerAdminMarketBackfill } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import type { AdminMarketBackfillModule, AuditLogItem } from "../types/admin.types";
import { resolveAdminError } from "../utils/adminErrors";

const MARKET_AUDIT_TARGETS = ["market"];

export function marketAuditTitle(item: AuditLogItem) {
    return item.action === "BACKFILL_TRIGGERED" ? i18n.t("admin.marketJobs.backfillTriggered") : item.action;
}

export function marketAuditDescription(item: AuditLogItem) {
    const target = item.targetId ? `${item.targetType} #${item.targetId}` : item.targetType || "market";
    return `${item.actorUsername ?? "Sistem"} -> ${target}${item.reason ? `: ${item.reason}` : ""}`;
}

export function useAdminMarketJobsPage() {
    const { showToast } = useToast();
    const [pendingModule, setPendingModule] = useState<AdminMarketBackfillModule | null>(null);
    const [clearingModule, setClearingModule] = useState<AdminMarketBackfillModule | null>(null);
    const auditTrail = useAdminAuditLogs(MARKET_AUDIT_TARGETS);

    const triggerBackfill = async (module: AdminMarketBackfillModule) => {
        setPendingModule(module);
        try {
            const response = await triggerAdminMarketBackfill(module);
            showToast(response.message, response.status === "ALREADY_RUNNING" ? "info" : "success");
            invalidateAdminQuery({ scope: "market-audit" });
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, i18n.t("admin.marketJobs.backfillError")), "error");
        } finally {
            setPendingModule(null);
        }
    };

    const clearModule = async (module: AdminMarketBackfillModule) => {
        setClearingModule(module);
        try {
            const deleted = await clearAdminMarketData(module);
            showToast(i18n.t("admin.marketJobs.clearSuccess", { module: module.toUpperCase(), count: deleted }), "success");
            invalidateAdminQuery({ scope: "market-audit" });
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, i18n.t("admin.marketJobs.clearError")), "error");
        } finally {
            setClearingModule(null);
        }
    };

    return {
        auditTrail,
        pending: {
            module: pendingModule,
            clearingModule,
        },
        handlers: {
            triggerBackfill,
            clearModule,
        },
    };
}
