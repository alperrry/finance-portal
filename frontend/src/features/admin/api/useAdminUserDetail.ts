import { useQuery } from "@tanstack/react-query";
import type { AdminUserDetail } from "../types/admin.types";
import { fetchAdminUserDetail } from "./adminApi";

export function useAdminUserDetail(userId: number | null) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "user-detail", userId],
        queryFn: () => fetchAdminUserDetail(userId!),
        enabled: userId !== null,
        staleTime: 2 * 60 * 1000,
    });

    return {
        data: data ?? null as AdminUserDetail | null,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Kullanıcı detayı yüklenemedi.") : null,
        refetch: () => void refetch(),
    };
}
