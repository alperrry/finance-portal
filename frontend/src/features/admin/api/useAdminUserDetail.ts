import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import type { AdminUserDetail } from "../types/admin.types";
import { fetchAdminUserDetail } from "./adminApi";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useAdminUserDetail(userId: number | null) {
    const [data, setData] = useState<AdminUserDetail | null>(null);
    const [loading, setLoading] = useState(Boolean(userId));
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        hasLoadedRef.current = false;
        setData(null);
        setLoading(Boolean(userId));
    }, [userId]);

    const refetch = useCallback(async () => {
        if (!userId) return;
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            setData(await fetchAdminUserDetail(userId));
            hasLoadedRef.current = true;
        } catch (caughtError) {
            setError(resolveError(caughtError, "Kullanıcı detayı yüklenemedi."));
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === "user-detail" && detail.userId === userId) void refetch();
    }), [refetch, userId]);

    return { data, loading, error, refetch };
}
