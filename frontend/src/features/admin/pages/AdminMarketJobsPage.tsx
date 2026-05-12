import { Box } from "@mui/material";
import { AdminAuditPanel } from "../components/AdminAuditPanel";
import { AdminMarketJobsPanel } from "../components/AdminMarketJobsPanel";
import {
    marketAuditDescription,
    marketAuditTitle,
    useAdminMarketJobsPage,
} from "../hooks/useAdminMarketJobsPage";

export function AdminMarketJobsPage() {
    const { auditTrail, pending, handlers } = useAdminMarketJobsPage();

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <AdminMarketJobsPanel
                pendingModule={pending.module}
                onTrigger={(module) => void handlers.triggerBackfill(module)}
            />

            <AdminAuditPanel
                title="Market audit geçmişi"
                loading={auditTrail.loading}
                error={auditTrail.error}
                items={auditTrail.data}
                getTitle={marketAuditTitle}
                getDescription={marketAuditDescription}
            />
        </Box>
    );
}
