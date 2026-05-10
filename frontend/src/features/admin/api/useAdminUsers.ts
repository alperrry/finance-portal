import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminUserListItem, AdminUsersFilter } from "../types/admin.types";
import { fetchAdminUsers } from "./adminApi";

export function useAdminUsers() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "users"],
        queryFn: fetchAdminUsers,
        staleTime: 2 * 60 * 1000,
    });

    return {
        data: data ?? [],
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "Kullanıcılar yüklenemedi.") : null,
        refetch: () => void refetch(),
    };
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
