import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AdminAuditPanel } from "../components/AdminAuditPanel";
import { AdminMarketJobsPanel } from "../components/AdminMarketJobsPanel";
import {
    marketAuditDescription,
    marketAuditTitle,
    useAdminMarketJobsPage,
} from "../hooks/useAdminMarketJobsPage";

export function AdminMarketJobsPage() {
    const { t } = useTranslation();
    const { auditTrail, pending, handlers } = useAdminMarketJobsPage();

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <AdminMarketJobsPanel
                pendingModule={pending.module}
                clearingModule={pending.clearingModule}
                onTrigger={(module) => void handlers.triggerBackfill(module)}
                onClear={(module) => void handlers.clearModule(module)}
            />

            <AdminAuditPanel
                title={t("admin.marketJobs.audit")}
                loading={auditTrail.loading}
                error={auditTrail.error}
                items={auditTrail.data}
                getTitle={marketAuditTitle}
                getDescription={marketAuditDescription}
            />
        </Box>
    );
}
