import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../components/ToastContext";
import type { UpdateUserRoleRequest } from "../types/admin.types";
import { updateAdminUserRole } from "./adminApi";

export function useUpdateUserRole() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ userId, payload }: { userId: number; payload: UpdateUserRoleRequest }) =>
            updateAdminUserRole(userId, payload),
        onSuccess: (_data, { userId }) => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            void queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", userId] });
            showToast("Kullanıcı rolü güncellendi.", "success");
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : "Rol güncellenemedi.";
            showToast(message, "error");
        },
    });

    return {
        mutate: (userId: number, payload: UpdateUserRoleRequest) => mutation.mutateAsync({ userId, payload }),
        pending: mutation.isPending,
    };
}
