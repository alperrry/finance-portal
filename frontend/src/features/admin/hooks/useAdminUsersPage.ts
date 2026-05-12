import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAdminUsers, useFilteredAdminUsers } from "../api/useAdminUsers";
import { useResetUser2FA } from "../api/useResetUser2FA";
import { useUpdateUserRole } from "../api/useUpdateUserRole";
import { useUpdateUserStatus } from "../api/useUpdateUserStatus";
import type { AdminDialogState } from "../components/AdminDialogs";
import type { AdminUserRole, AdminUserStatus, AdminUsersFilter } from "../types/admin.types";
import { useUserUpdates } from "../websocket/useUserUpdates";

function readFilters(params: URLSearchParams): AdminUsersFilter {
    const role = params.get("role");
    const status = params.get("status");
    return {
        search: params.get("search") ?? "",
        role: role === "ADMIN" || role === "NORMAL_USER" ? role : "",
        status: status === "ACTIVE" || status === "PASSIVE" ? status : "",
    };
}

export function useAdminUsersPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const filters = useMemo(() => readFilters(params), [params]);
    const usersQuery = useAdminUsers();
    const users = useFilteredAdminUsers(usersQuery.data, filters);
    const { isHighlighted } = useUserUpdates();
    const [dialog, setDialog] = useState<AdminDialogState>(null);
    const roleMutation = useUpdateUserRole();
    const statusMutation = useUpdateUserStatus();
    const resetMutation = useResetUser2FA();

    const updateFilter = (key: keyof AdminUsersFilter, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        setParams(next, { replace: true });
    };

    const closeDialog = () => setDialog(null);

    return {
        users,
        filters,
        usersQuery,
        dialogs: {
            state: dialog,
            open: setDialog,
            close: closeDialog,
        },
        handlers: {
            updateFilter,
            openDetail: (userId: number) => navigate(`/admin/users/${userId}`),
            onRoleSubmit: async (role: AdminUserRole, reason: string) => {
                if (!dialog?.user) return;
                await roleMutation.mutate(dialog.user.id, { role, reason });
                closeDialog();
            },
            onStatusSubmit: async (status: AdminUserStatus, reason: string) => {
                if (!dialog?.user) return;
                await statusMutation.mutate(dialog.user.id, { status, reason });
                closeDialog();
            },
            onResetSubmit: async (reason: string) => {
                if (!dialog?.user) return;
                await resetMutation.mutate(dialog.user.id, { reason });
                closeDialog();
            },
        },
        pending: {
            role: roleMutation.pending,
            status: statusMutation.pending,
            reset: resetMutation.pending,
        },
        isHighlighted,
    };
}
