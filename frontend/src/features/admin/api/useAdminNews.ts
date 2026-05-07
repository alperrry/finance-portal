import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import type { AdminNewsQuery, AdminNewsSummary, AdminPageResponse } from "../types/admin.types";
import { fetchAdminNews } from "./adminApi";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

const EMPTY_PAGE: AdminPageResponse<AdminNewsSummary> = {
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
};

export function useAdminNews(query: AdminNewsQuery) {
    const [data, setData] = useState<AdminPageResponse<AdminNewsSummary>>({ ...EMPTY_PAGE, size: query.size });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const queryKey = JSON.stringify(query);

    const refetch = useCallback(async () => {
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            setData(await fetchAdminNews(query));
            hasLoadedRef.current = true;
        } catch (caughtError) {
            setError(resolveError(caughtError, "Haberler yüklenemedi."));
        } finally {
            setLoading(false);
        }
    }, [queryKey]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === "news-list") void refetch();
    }), [refetch]);

    return { data, loading, error, refetch };
}
