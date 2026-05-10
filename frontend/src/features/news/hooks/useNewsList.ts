import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchNews } from "../api/newsApi";
import { buildPageItems, formatTopClock, PAGE_SIZE } from "../utils/newsFormatters";

export function useNewsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryFromUrl = searchParams.get("category") ?? "";
    const selectedCategoryId = /^\d+$/.test(categoryFromUrl) ? categoryFromUrl : "";

    const [pageIndex, setPageIndex] = useState(1);

    const now = useMemo(() => new Date(), []);
    const navClock = useMemo(() => formatTopClock(now), [now]);

    const newsQuery = useQuery({
        queryKey: ["news", "list", { page: pageIndex - 1, categoryId: selectedCategoryId }],
        queryFn: () =>
            fetchNews({
                page: pageIndex - 1,
                size: PAGE_SIZE,
                sortBy: "createdAt",
                direction: "DESC",
                categoryId: selectedCategoryId === "" ? undefined : Number(selectedCategoryId),
            }),
        staleTime: 2 * 60 * 1000,
    });

    const categoriesQuery = useQuery({
        queryKey: ["news", "categories"],
        queryFn: () => fetchCategories(true),
        staleTime: 10 * 60 * 1000,
    });

    const categories = categoriesQuery.data ?? [];
    const pageData = newsQuery.data ?? null;
    const cards = pageData?.content ?? [];
    const totalPages = pageData?.totalPages ?? 0;
    const totalElements = pageData?.totalElements ?? 0;
    const pageItems = useMemo(() => buildPageItems(pageIndex, totalPages), [pageIndex, totalPages]);
    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return "Tum kategoriler";
        return categories.find((c) => String(c.id) === selectedCategoryId)?.name ?? "Kategori";
    }, [categories, selectedCategoryId]);

    const applyCategoryFilter = (categoryId: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (categoryId) nextParams.set("category", categoryId);
        else nextParams.delete("category");
        setSearchParams(nextParams, { replace: true });
        setPageIndex(1);
    };

    return {
        loading: newsQuery.isLoading,
        cards,
        totalPages,
        totalElements,
        pageItems,
        categories,
        selectedCategoryId,
        selectedCategoryName,
        navClock,
        pageIndex,
        setPageIndex,
        setReloadToken: () => void newsQuery.refetch(),
        applyCategoryFilter,
    };
}
