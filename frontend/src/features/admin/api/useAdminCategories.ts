import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import type { AdminCategory } from "../types/admin.types";
import { fetchAdminCategories } from "./adminApi";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useAdminCategories() {
    const [data, setData] = useState<AdminCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

    const refetch = useCallback(async () => {
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            setData(await fetchAdminCategories());
            hasLoadedRef.current = true;
        } catch (caughtError) {
            setError(resolveError(caughtError, "Kategoriler yüklenemedi."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === "categories") void refetch();
    }), [refetch]);

    return { data, loading, error, refetch };
}

export function useFilteredAdminCategories(categories: AdminCategory[], search: string) {
    return useMemo(() => {
        const query = search.trim().toLocaleLowerCase("tr-TR");
        if (!query) return categories;
        return categories.filter((category) => category.name.toLocaleLowerCase("tr-TR").includes(query));
    }, [categories, search]);
}
