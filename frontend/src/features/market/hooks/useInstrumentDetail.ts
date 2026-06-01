import { useMemo } from "react";
import i18n from "../../../i18n";
import { useQuery } from "@tanstack/react-query";
import { fetchInstrumentHistory, type HistoryResponse } from "../../analysis/api/historyApi";
import type { InstrumentType } from "../../analysis/api/historyApi";
import { fetchGoogleNewsRss, type GoogleNewsItem } from "../../news/api/newsApi";
import type { RangeKey, InstrumentSummary } from "../types";
import { fetchInstrumentSummary, buildNewsQuery, getRangeDates } from "../utils/instrumentSummary";

type UseInstrumentDetail = {
    summary: InstrumentSummary | null;
    summaryError: string | null;
    loadingSummary: boolean;
    history: HistoryResponse | null;
    historyError: string | null;
    loadingHistory: boolean;
    newsItems: GoogleNewsItem[] | null;
    newsError: string | null;
    loadingNews: boolean;
    rangeDates: { from: string; to: string };
};

export function useInstrumentDetail(
    instrumentType: InstrumentType | null,
    code: string,
    range: RangeKey,
): UseInstrumentDetail {
    const today = useMemo(() => new Date(), []);
    const rangeDates = useMemo(() => getRangeDates(range, today), [range, today]);

    const enabled = Boolean(instrumentType && code);

    const summaryQuery = useQuery({
        queryKey: ["market", "instrument", instrumentType, code],
        queryFn: () => fetchInstrumentSummary(instrumentType!, code),
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    const historyQuery = useQuery({
        queryKey: ["market", "history", instrumentType, code, range, rangeDates.from, rangeDates.to],
        queryFn: () => fetchInstrumentHistory(instrumentType!, code, rangeDates.from, rangeDates.to),
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    const newsQuery = useQuery({
        queryKey: ["market", "instrument-news", instrumentType, code],
        queryFn: () => fetchGoogleNewsRss(buildNewsQuery(summaryQuery.data!), { limit: 8 }),
        enabled: enabled && !!summaryQuery.data,
        staleTime: 10 * 60 * 1000,
    });

    return {
        summary: summaryQuery.data ?? null,
        summaryError: summaryQuery.error ? (summaryQuery.error instanceof Error ? summaryQuery.error.message : i18n.t("market.errors.instrumentDetail")) : null,
        loadingSummary: summaryQuery.isLoading,
        history: historyQuery.data ?? null,
        historyError: historyQuery.error ? (historyQuery.error instanceof Error ? historyQuery.error.message : i18n.t("market.errors.historicalData")) : null,
        loadingHistory: historyQuery.isLoading,
        newsItems: newsQuery.data ?? null,
        newsError: newsQuery.error ? (newsQuery.error instanceof Error ? newsQuery.error.message : i18n.t("market.errors.instrumentNews")) : null,
        loadingNews: newsQuery.isLoading,
        rangeDates,
    };
}
