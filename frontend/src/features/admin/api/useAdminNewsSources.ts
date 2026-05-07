import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import type { AdminNewsSource } from "../types/admin.types";
import { fetchAdminNewsSources } from "./adminApi";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useAdminNewsSources() {
    const [data, setData] = useState<AdminNewsSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

    const refetch = useCallback(async () => {
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            setData(await fetchAdminNewsSources());
            hasLoadedRef.current = true;
        } catch (caughtError) {
            setError(resolveError(caughtError, "RSS kaynakları yüklenemedi."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === "news-sources") void refetch();
    }), [refetch]);

    return { data, loading, error, refetch };
}

export function useFilteredAdminNewsSources(sources: AdminNewsSource[], search: string) {
    return useMemo(() => {
        const query = search.trim().toLocaleLowerCase("tr-TR");
        if (!query) return sources;
        return sources.filter((source) => `${source.name} ${source.sourceUrl}`.toLocaleLowerCase("tr-TR").includes(query));
    }, [search, sources]);
}
