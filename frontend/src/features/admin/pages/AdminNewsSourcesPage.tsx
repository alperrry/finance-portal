import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AdminAuditPanel } from "../components/AdminAuditPanel";
import { AdminNewsSourceDialog } from "../components/AdminNewsSourceDialog";
import { AdminNewsSourcesPanel } from "../components/AdminNewsSourcesPanel";
import {
    sourceAuditDescription,
    sourceAuditTitle,
    useAdminNewsSourcesPage,
} from "../hooks/useAdminNewsSourcesPage";

export function AdminNewsSourcesPage() {
    const { t } = useTranslation();
    const { sources, sourcesQuery, auditTrail, search, dialogs, handlers, pending } =
        useAdminNewsSourcesPage();

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <AdminNewsSourcesPanel
                sources={sources}
                search={search}
                loading={sourcesQuery.loading}
                error={sourcesQuery.error}
                pendingAction={pending.action}
                onSearchChange={handlers.setSearch}
                onCreate={dialogs.openCreate}
                onEdit={dialogs.openEdit}
                onDelete={dialogs.openDelete}
                onFetch={(source) => void handlers.triggerFetch(source)}
            />

            <AdminAuditPanel
                title={t("admin.sources.audit")}
                loading={auditTrail.loading}
                error={auditTrail.error}
                items={auditTrail.data}
                getTitle={sourceAuditTitle}
                getDescription={sourceAuditDescription}
            />

            <AdminNewsSourceDialog
                state={dialogs.state}
                pending={pending.save}
                onClose={dialogs.close}
                onSubmit={handlers.saveSource}
                onDelete={handlers.deleteSource}
            />
        </Box>
    );
}
