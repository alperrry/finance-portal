import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AdminAuditPanel } from "../components/AdminAuditPanel";
import { AdminCategoriesPanel } from "../components/AdminCategoriesPanel";
import { AdminCategoryDialog } from "../components/AdminCategoryDialog";
import {
    categoryAuditDescription,
    categoryAuditTitle,
    useAdminCategoriesPage,
} from "../hooks/useAdminCategoriesPage";

export function AdminCategoriesPage() {
    const { t } = useTranslation();
    const { categories, categoriesQuery, auditTrail, search, dialogs, handlers, pending } =
        useAdminCategoriesPage();

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <AdminCategoriesPanel
                categories={categories}
                search={search}
                loading={categoriesQuery.loading}
                error={categoriesQuery.error}
                pendingAction={pending.action}
                onSearchChange={handlers.setSearch}
                onCreate={dialogs.openCreate}
                onEdit={dialogs.openEdit}
                onDelete={dialogs.openDelete}
                onToggle={(category) => void handlers.toggleCategory(category)}
            />

            <AdminAuditPanel
                title={t("admin.categories.audit")}
                loading={auditTrail.loading}
                error={auditTrail.error}
                items={auditTrail.data}
                getTitle={categoryAuditTitle}
                getDescription={categoryAuditDescription}
            />

            <AdminCategoryDialog
                state={dialogs.state}
                pending={pending.save}
                onClose={dialogs.close}
                onSubmit={handlers.saveCategory}
                onDelete={handlers.removeCategory}
            />
        </Box>
    );
}
