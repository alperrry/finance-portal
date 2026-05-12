import { useState } from "react";
import { useToast } from "../../../components/ToastContext";
import { triggerAdminMarketBackfill } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import type { AdminMarketBackfillModule, AuditLogItem } from "../types/admin.types";
import { resolveAdminError } from "../utils/adminErrors";

const MARKET_AUDIT_TARGETS = ["market"];

export function marketAuditTitle(item: AuditLogItem) {
    return item.action === "BACKFILL_TRIGGERED" ? "Backfill tetiklendi" : item.action;
}

export function marketAuditDescription(item: AuditLogItem) {
    const target = item.targetId ? `${item.targetType} #${item.targetId}` : item.targetType || "market";
    return `${item.actorUsername ?? "Sistem"} -> ${target}${item.reason ? `: ${item.reason}` : ""}`;
}

export function useAdminMarketJobsPage() {
    const { showToast } = useToast();
    const [pendingModule, setPendingModule] = useState<AdminMarketBackfillModule | null>(null);
    const auditTrail = useAdminAuditLogs(MARKET_AUDIT_TARGETS);

    const triggerBackfill = async (module: AdminMarketBackfillModule) => {
        setPendingModule(module);
        try {
            const response = await triggerAdminMarketBackfill(module);
            showToast(response.message, response.status === "ALREADY_RUNNING" ? "info" : "success");
            invalidateAdminQuery({ scope: "market-audit" });
        } catch (caughtError) {
            showToast(resolveAdminError(caughtError, "Backfill başlatılamadı."), "error");
        } finally {
            setPendingModule(null);
        }
    };

    return {
        auditTrail,
        pending: {
            module: pendingModule,
        },
        handlers: {
            triggerBackfill,
        },
    };
}
