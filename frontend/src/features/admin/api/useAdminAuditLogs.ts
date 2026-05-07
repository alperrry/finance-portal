import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import type { AuditLogItem } from "../types/admin.types";
import { fetchAdminAuditLogs } from "./adminApi";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

type AdminAuditScope = "news-audit" | "category-audit" | "market-audit";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useAdminAuditLogs(targetTypes: string[], scope: AdminAuditScope) {
    const [data, setData] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const targetKey = targetTypes.join(",");
    const stableTargetTypes = useMemo(() => targetKey.split(",").filter(Boolean), [targetKey]);

    const refetch = useCallback(async () => {
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            setData(await fetchAdminAuditLogs(stableTargetTypes));
            hasLoadedRef.current = true;
        } catch (caughtError) {
            setError(resolveError(caughtError, "Audit kayıtları yüklenemedi."));
        } finally {
            setLoading(false);
        }
    }, [stableTargetTypes]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === scope) void refetch();
    }), [refetch, scope]);

    return { data, loading, error, refetch };
}
