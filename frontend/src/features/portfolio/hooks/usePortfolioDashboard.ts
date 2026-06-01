import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchPortfolio, fetchPortfolios, type PortfolioResponse } from "../api/portfolioApi";
import { useAuth } from "../../../app/auth/AuthContext";
import { useTradeNotifications } from "../../../hooks/useTradeNotifications";
import { resolveApiError } from "../utils/portfolioFormatters";

async function fetchDashboardPortfolios() {
    const data = await fetchPortfolios();
    const detailResults = await Promise.allSettled(data.map((portfolio) => fetchPortfolio(portfolio.id)));
    const detailsById = new Map<number, PortfolioResponse>();
    detailResults.forEach((result) => {
        if (result.status === "fulfilled") detailsById.set(result.value.id, result.value);
    });
    return data.map((portfolio) => detailsById.get(portfolio.id) ?? portfolio);
}

export function usePortfolioDashboard() {
    const { t } = useTranslation();
    const { token, refreshCurrentUser } = useAuth();
    const portfoliosQuery = useQuery({
        queryKey: ["portfolio", "dashboard"],
        queryFn: fetchDashboardPortfolios,
        staleTime: 60 * 1000,
    });

    const portfolios = portfoliosQuery.data ?? [];
    const reload = useCallback(() => {
        void portfoliosQuery.refetch();
    }, [portfoliosQuery]);
    const listState = {
        loading: portfoliosQuery.isLoading,
        error: portfoliosQuery.error ? resolveApiError(portfoliosQuery.error, t("portfolio.errors.listFailed")) : null,
    };

    useTradeNotifications({
        token,
        activePortfolioId: null,
        onPortfolioSignal: reload,
        onMarketSignal: reload,
        onBalanceSignal: refreshCurrentUser,
    });

    const isEmpty = !listState.loading && !listState.error && portfolios.length === 0;

    return { portfolios, listState, reload, isEmpty };
}
