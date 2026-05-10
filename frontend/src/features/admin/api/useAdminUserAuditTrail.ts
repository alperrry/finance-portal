import { useQuery } from "@tanstack/react-query";
import type { AuditLogItem } from "../types/admin.types";
import { fetchAdminUserAuditTrail } from "./adminApi";

export function useAdminUserAuditTrail(userId: number | null) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "user-audit-trail", userId],
        queryFn: () => fetchAdminUserAuditTrail(userId!),
        enabled: userId !== null,
        staleTime: 1 * 60 * 1000,
    });

    return {
        data: data ?? [] as AuditLogItem[],
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Audit kayıtları yüklenemedi.") : null,
        refetch: () => void refetch(),
    };
}
