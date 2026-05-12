import { useCallback, useMemo, useState } from "react";
import { useAdminUserAuditTrail } from "../api/useAdminUserAuditTrail";
import { useAdminUserDetail } from "../api/useAdminUserDetail";
import { useResetUser2FA } from "../api/useResetUser2FA";
import { useUpdateUserRole } from "../api/useUpdateUserRole";
import { useUpdateUserStatus } from "../api/useUpdateUserStatus";
import type { AdminUserRole, AdminUserStatus } from "../types/admin.types";
import type { AdminDialogState } from "../components/AdminDialogs";

export function useAdminUserDetailPage(userId: number | null) {
    const detail = useAdminUserDetail(userId);
    const auditTrail = useAdminUserAuditTrail(userId);

    const roleMutation = useUpdateUserRole();
    const statusMutation = useUpdateUserStatus();
    const resetMutation = useResetUser2FA();

    const [dialog, setDialog] = useState<AdminDialogState>(null);

    const closeDialog = useCallback(() => setDialog(null), []);

    const openRoleDialog = useCallback(() => {
        if (!detail.data) return;
        setDialog({ type: "role", user: detail.data });
    }, [detail.data]);

    const openStatusDialog = useCallback(() => {
        if (!detail.data) return;
        setDialog({ type: "status", user: detail.data });
    }, [detail.data]);

    const openReset2FADialog = useCallback(() => {
        if (!detail.data) return;
        setDialog({ type: "reset-2fa", user: detail.data });
    }, [detail.data]);

    const handleRoleSubmit = useCallback(
        async (role: AdminUserRole, reason: string) => {
            if (!dialog?.user) return;
            await roleMutation.mutate(dialog.user.id, { role, reason });
            closeDialog();
        },
        [dialog, roleMutation, closeDialog],
    );

    const handleStatusSubmit = useCallback(
        async (status: AdminUserStatus, reason: string) => {
            if (!dialog?.user) return;
            await statusMutation.mutate(dialog.user.id, { status, reason });
            closeDialog();
        },
        [dialog, statusMutation, closeDialog],
    );

    const handleResetSubmit = useCallback(
        async (reason: string) => {
            if (!dialog?.user) return;
            await resetMutation.mutate(dialog.user.id, { reason });
            closeDialog();
        },
        [dialog, resetMutation, closeDialog],
    );

    const pending = useMemo(
        () => ({
            role: roleMutation.pending,
            status: statusMutation.pending,
            reset: resetMutation.pending,
        }),
        [roleMutation.pending, statusMutation.pending, resetMutation.pending],
    );

    const dialogs = useMemo(
        () => ({
            state: dialog,
            openRole: openRoleDialog,
            openStatus: openStatusDialog,
            openReset2FA: openReset2FADialog,
            close: closeDialog,
        }),
        [dialog, openRoleDialog, openStatusDialog, openReset2FADialog, closeDialog],
    );

    const handlers = useMemo(
        () => ({
            onRoleSubmit: handleRoleSubmit,
            onStatusSubmit: handleStatusSubmit,
            onResetSubmit: handleResetSubmit,
        }),
        [handleRoleSubmit, handleStatusSubmit, handleResetSubmit],
    );

    return {
        user: detail.data ?? null,
        detail,
        auditTrail,
        dialogs,
        handlers,
        pending,
    };
}
