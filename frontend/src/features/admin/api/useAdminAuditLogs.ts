import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditLogItem } from "../types/admin.types";
import { fetchAdminAuditLogs } from "./adminApi";

export function useAdminAuditLogs(targetTypes: string[]) {
    const targetKey = targetTypes.join(",");
    const stableTargetTypes = useMemo(() => targetKey.split(",").filter(Boolean), [targetKey]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "audit-logs", stableTargetTypes],
        queryFn: () => fetchAdminAuditLogs(stableTargetTypes),
        staleTime: 1 * 60 * 1000,
    });

    return {
        data: data ?? [] as AuditLogItem[],
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Audit kayıtları yüklenemedi.") : null,
        refetch: () => void refetch(),
    };
}
