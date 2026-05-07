import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import type { AdminUserListItem, AdminUsersFilter } from "../types/admin.types";
import { fetchAdminUsers } from "./adminApi";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

type AdminUsersState = {
    data: AdminUserListItem[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

export function useAdminUsers(): AdminUsersState {
    const [data, setData] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

    const refetch = useCallback(async () => {
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            setData(await fetchAdminUsers());
            hasLoadedRef.current = true;
        } catch (caughtError) {
            setError(resolveError(caughtError, "Kullanıcılar yüklenemedi."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === "users") void refetch();
    }), [refetch]);

    return { data, loading, error, refetch };
}

export function useFilteredAdminUsers(users: AdminUserListItem[], filters: AdminUsersFilter) {
    return useMemo(() => {
        const query = filters.search.trim().toLocaleLowerCase("tr-TR");
        return users.filter((user) => {
            const name = `${user.firstName ?? ""} ${user.lastName ?? ""} ${user.username} ${user.email}`.toLocaleLowerCase("tr-TR");
            const searchOk = !query || name.includes(query);
            const roleOk = !filters.role || user.role === filters.role;
            const statusOk = !filters.status || user.status === filters.status;
            return searchOk && roleOk && statusOk;
        });
    }, [filters, users]);
}
