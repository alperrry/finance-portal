import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminNewsSource } from "../types/admin.types";
import { fetchAdminNewsSources } from "./adminApi";

export function useAdminNewsSources() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "news-sources"],
        queryFn: fetchAdminNewsSources,
        staleTime: 2 * 60 * 1000,
    });

    return {
        data: data ?? [] as AdminNewsSource[],
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : "RSS kaynakları yüklenemedi.") : null,
        refetch: () => void refetch(),
    };
}

export function useFilteredAdminNewsSources(sources: AdminNewsSource[], search: string) {
    return useMemo(() => {
        const query = search.trim().toLocaleLowerCase("tr-TR");
        if (!query) return sources;
        return sources.filter((source) => `${source.name} ${source.sourceUrl}`.toLocaleLowerCase("tr-TR").includes(query));
    }, [search, sources]);
}
