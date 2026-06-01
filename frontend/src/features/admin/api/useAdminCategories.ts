import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminCategory } from "../types/admin.types";
import { fetchAdminCategories } from "./adminApi";
import i18n from "../../../i18n";

export function useAdminCategories() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "categories"],
        queryFn: fetchAdminCategories,
        staleTime: 2 * 60 * 1000,
    });

    return {
        data: data ?? [] as AdminCategory[],
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : i18n.t("admin.categories.loadError")) : null,
        refetch: () => void refetch(),
    };
}

export function useFilteredAdminCategories(categories: AdminCategory[], search: string) {
    return useMemo(() => {
        const query = search.trim().toLocaleLowerCase("tr-TR");
        if (!query) return categories;
        return categories.filter((category) => category.name.toLocaleLowerCase("tr-TR").includes(query));
    }, [categories, search]);
}
