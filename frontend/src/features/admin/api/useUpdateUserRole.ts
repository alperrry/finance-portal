import { useState } from "react";
import { ApiError } from "../../../api/client";
import { useToast } from "../../../components/ToastContext";
import type { UpdateUserRoleRequest } from "../types/admin.types";
import { updateAdminUserRole } from "./adminApi";
import { invalidateAdminQuery } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useUpdateUserRole() {
    const { showToast } = useToast();
    const [pending, setPending] = useState(false);

    const mutate = async (userId: number, payload: UpdateUserRoleRequest) => {
        setPending(true);
        try {
            await updateAdminUserRole(userId, payload);
            invalidateAdminQuery({ scope: "users" });
            invalidateAdminQuery({ scope: "user-detail", userId });
            showToast("Kullanıcı rolü güncellendi.", "success");
        } catch (caughtError) {
            const message = resolveError(caughtError, "Rol güncellenemedi.");
            showToast(message, "error");
            throw new Error(message);
        } finally {
            setPending(false);
        }
    };

    return { mutate, pending };
}
