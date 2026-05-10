import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../components/ToastContext";
import type { ResetUser2FARequest } from "../types/admin.types";
import { resetAdminUser2FA } from "./adminApi";

export function useResetUser2FA() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ userId, payload }: { userId: number; payload: ResetUser2FARequest }) =>
            resetAdminUser2FA(userId, payload),
        onSuccess: (_data, { userId }) => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            void queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", userId] });
            showToast("İki aşamalı doğrulama sıfırlandı.", "success");
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : "İki aşamalı doğrulama sıfırlanamadı.";
            showToast(message, "error");
        },
    });

    return {
        mutate: (userId: number, payload: ResetUser2FARequest) => mutation.mutateAsync({ userId, payload }),
        pending: mutation.isPending,
    };
}
