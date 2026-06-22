import { useQuery } from "@tanstack/react-query";
import i18n from "../../../i18n";
import { fetchAdminDashboard } from "./adminApi";

export function useAdminDashboard() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["admin", "dashboard"],
        queryFn: fetchAdminDashboard,
        staleTime: 60 * 1000,
    });

    return {
        data: data ?? null,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : i18n.t("admin.dashboard.loadError")) : null,
        refetch: () => void refetch(),
    };
}
