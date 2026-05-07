import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import type { AuditLogItem } from "../types/admin.types";
import { fetchAdminUserAuditTrail } from "./adminApi";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useAdminUserAuditTrail(userId: number | null) {
    const [data, setData] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(Boolean(userId));
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        hasLoadedRef.current = false;
        setData([]);
        setLoading(Boolean(userId));
    }, [userId]);

    const refetch = useCallback(async () => {
        if (!userId) return;
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            setData(await fetchAdminUserAuditTrail(userId));
            hasLoadedRef.current = true;
        } catch (caughtError) {
            setError(resolveError(caughtError, "Audit kayıtları yüklenemedi."));
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === "audit-trail" && detail.userId === userId) void refetch();
    }), [refetch, userId]);

    return { data, loading, error, refetch };
}
