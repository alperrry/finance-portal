import { useState } from "react";
import { ApiError } from "../../../api/client";
import { useToast } from "../../../components/ToastContext";
import type { UpdateUserStatusRequest } from "../types/admin.types";
import { updateAdminUserStatus } from "./adminApi";
import { invalidateAdminQuery } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useUpdateUserStatus() {
    const { showToast } = useToast();
    const [pending, setPending] = useState(false);

    const mutate = async (userId: number, payload: UpdateUserStatusRequest) => {
        setPending(true);
        try {
            await updateAdminUserStatus(userId, payload);
            invalidateAdminQuery({ scope: "users" });
            invalidateAdminQuery({ scope: "user-detail", userId });
            showToast("Kullanıcı durumu güncellendi.", "success");
        } catch (caughtError) {
            const message = resolveError(caughtError, "Durum güncellenemedi.");
            showToast(message, "error");
            throw new Error(message);
        } finally {
            setPending(false);
        }
    };

    return { mutate, pending };
}
