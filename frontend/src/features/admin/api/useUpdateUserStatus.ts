import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../components/ToastContext";
import type { UpdateUserStatusRequest } from "../types/admin.types";
import { updateAdminUserStatus } from "./adminApi";

export function useUpdateUserStatus() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ userId, payload }: { userId: number; payload: UpdateUserStatusRequest }) =>
            updateAdminUserStatus(userId, payload),
        onSuccess: (_data, { userId }) => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            void queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", userId] });
            showToast("Kullanıcı durumu güncellendi.", "success");
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : "Durum güncellenemedi.";
            showToast(message, "error");
        },
    });

    return {
        mutate: (userId: number, payload: UpdateUserStatusRequest) => mutation.mutateAsync({ userId, payload }),
        pending: mutation.isPending,
    };
}
