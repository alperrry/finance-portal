import { useQuery } from "@tanstack/react-query";
import type { AdminNewsQuery, AdminNewsSummary, AdminPageResponse } from "../types/admin.types";
import { fetchAdminNews } from "./adminApi";
import i18n from "../../../i18n";

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
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "news", query],
        queryFn: () => fetchAdminNews(query),
        staleTime: 1 * 60 * 1000,
    });

    return {
        data: data ?? { ...EMPTY_PAGE, size: query.size },
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : i18n.t("admin.news.loadError")) : null,
        refetch: () => void refetch(),
    };
}
