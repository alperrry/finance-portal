import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsById } from "../api/newsApi";
import { buildDynamicTags } from "../utils/newsFormatters";

export function useNewsDetail() {
    const { id } = useParams();
    const numericId = useMemo(() => (id ? Number(id) : NaN), [id]);
    const invalidId = !Number.isFinite(numericId);

    const { data: news, isLoading, error } = useQuery({
        queryKey: ["news", "detail", numericId],
        queryFn: () => fetchNewsById(numericId),
        enabled: !invalidId,
        staleTime: 5 * 60 * 1000,
    });

    const detailTags = useMemo(() => (news ? buildDynamicTags(news, 6) : []), [news]);

    return {
        loading: isLoading,
        news: news ?? null,
        error: error ? (error instanceof Error ? error.message : "Haber detayi yuklenemedi.") : null,
        detailTags,
        invalidId,
    };
}
