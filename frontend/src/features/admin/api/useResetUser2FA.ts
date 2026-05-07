import { useState } from "react";
import { ApiError } from "../../../api/client";
import { useToast } from "../../../components/ToastContext";
import type { ResetUser2FARequest } from "../types/admin.types";
import { resetAdminUser2FA } from "./adminApi";
import { invalidateAdminQuery } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useResetUser2FA() {
    const { showToast } = useToast();
    const [pending, setPending] = useState(false);

    const mutate = async (userId: number, payload: ResetUser2FARequest) => {
        setPending(true);
        try {
            await resetAdminUser2FA(userId, payload);
            invalidateAdminQuery({ scope: "users" });
            invalidateAdminQuery({ scope: "user-detail", userId });
            showToast("İki aşamalı doğrulama sıfırlandı.", "success");
        } catch (caughtError) {
            const message = resolveError(caughtError, "İki aşamalı doğrulama sıfırlanamadı.");
            showToast(message, "error");
            throw new Error(message);
        } finally {
            setPending(false);
        }
    };

    return { mutate, pending };
}
