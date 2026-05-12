import { Box } from "@mui/material";
import {
    ChangeRoleDialog,
    ChangeStatusDialog,
    Reset2FADialog,
} from "../components/AdminDialogs";
import { AdminUsersPanel } from "../components/AdminUsersPanel";
import { useAdminUsersPage } from "../hooks/useAdminUsersPage";

export function AdminUsersPage() {
    const { users, filters, usersQuery, dialogs, handlers, pending, isHighlighted } = useAdminUsersPage();

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <AdminUsersPanel
                users={users}
                filters={filters}
                loading={usersQuery.loading}
                error={usersQuery.error}
                onFilterChange={handlers.updateFilter}
                onDetail={handlers.openDetail}
                onDialog={dialogs.open}
                isHighlighted={isHighlighted}
            />

            <ChangeRoleDialog
                state={dialogs.state}
                pending={pending.role}
                onClose={dialogs.close}
                onSubmit={handlers.onRoleSubmit}
            />
            <ChangeStatusDialog
                state={dialogs.state}
                pending={pending.status}
                onClose={dialogs.close}
                onSubmit={handlers.onStatusSubmit}
            />
            <Reset2FADialog
                state={dialogs.state}
                pending={pending.reset}
                onClose={dialogs.close}
                onSubmit={handlers.onResetSubmit}
            />
        </Box>
    );
}
