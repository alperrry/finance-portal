import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AdminAuditPanel } from "../components/AdminAuditPanel";
import {
    AdminNewsCategoryOverrideDialog,
    AdminNewsStatusDialog,
} from "../components/AdminNewsDialogs";
import { AdminNewsManagementPanel } from "../components/AdminNewsManagementPanel";
import {
    newsAuditDescription,
    newsAuditTitle,
    useAdminNewsManagementPage,
} from "../hooks/useAdminNewsManagementPage";

export function AdminNewsManagementPage() {
    const { t } = useTranslation();
    const { query, newsQuery, categoriesQuery, sourcesQuery, auditTrail, dialogs, handlers, pending } =
        useAdminNewsManagementPage();

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <AdminNewsManagementPanel
                query={query}
                news={newsQuery.data}
                loading={newsQuery.loading}
                error={newsQuery.error}
                categories={categoriesQuery.data}
                sources={sourcesQuery.data}
                onFilterChange={handlers.updateFilter}
                onStatusDialog={dialogs.openStatus}
                onCategoriesDialog={dialogs.openCategories}
            />

            <AdminAuditPanel
                title={t("admin.news.audit")}
                loading={auditTrail.loading}
                error={auditTrail.error}
                items={auditTrail.data}
                getTitle={newsAuditTitle}
                getDescription={newsAuditDescription}
            />

            <AdminNewsStatusDialog
                state={dialogs.state}
                pending={pending}
                onClose={dialogs.close}
                onSubmit={handlers.submitStatus}
            />
            <AdminNewsCategoryOverrideDialog
                state={dialogs.state}
                categories={categoriesQuery.data}
                pending={pending}
                onClose={dialogs.close}
                onSubmit={handlers.submitCategories}
            />
        </Box>
    );
}
