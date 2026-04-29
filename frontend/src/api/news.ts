import { apiFetch } from "./client";

export type NewsSource = {
    id: number;
    name: string;
    url?: string | null;
};

export type NewsCategory = {
    id: number;
    name: string;
};

export type NewsItem = {
    id: number;
    title: string;
    context: string;
    publishedAt: string | null;
    canonicalUrl?: string | null;
    externalId?: string | null;
    status?: string | null;
    source?: NewsSource | null;
    categories?: NewsCategory[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type GoogleNewsItem = {
    title: string;
    description: string;
    link: string;
    publishedAt: string | null;
    sourceName: string | null;
    sourceUrl: string | null;
};

export type PageResponse<T> = {
    content: T[];
    number: number;
    size: number;
    totalPages: number;
    totalElements: number;
    first: boolean;
    last: boolean;
};

type RawPageResponse<T> = {
    content?: T[];
    number?: number;
    size?: number;
    totalPages?: number;
    totalElements?: number;
    first?: boolean;
    last?: boolean;
    page?: {
        number?: number;
        size?: number;
        totalPages?: number;
        totalElements?: number;
    };
};

type RawNewsSource = {
    id?: number;
    name?: string;
    url?: string | null;
    sourceUrl?: string | null;
} | null;

type RawNewsCategory = {
    id?: number;
    name?: string;
};

type RawNewsItem = {
    id?: number;
    title?: string;
    context?: string | null;
    publishedAt?: string | null;
    published_at?: string | null;
    canonicalUrl?: string | null;
    canonical_url?: string | null;
    externalId?: string | null;
    external_id?: string | null;
    status?: string | null;
    source?: RawNewsSource;
    categories?: RawNewsCategory[];
    createdAt?: string | null;
    created_at?: string | null;
    updatedAt?: string | null;
    updated_at?: string | null;
};

type NewsQuery = {
    sourceId?: number;
    categoryId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'ASC' | 'DESC';
};

const normalizeNewsItem = (raw: RawNewsItem): NewsItem => {
    const source = raw.source
        ? {
              id: Number(raw.source.id ?? 0),
              name: raw.source.name ?? "Bilinmeyen Kaynak",
              url: raw.source.url ?? raw.source.sourceUrl ?? null,
          }
        : null;

    const categories = Array.isArray(raw.categories)
        ? raw.categories
              .filter((category): category is RawNewsCategory => Boolean(category?.id) && Boolean(category?.name))
              .map((category) => ({
                  id: Number(category.id),
                  name: String(category.name),
              }))
        : [];

    return {
        id: Number(raw.id ?? 0),
        title: raw.title ?? "",
        context: raw.context ?? "",
        publishedAt: raw.publishedAt ?? raw.published_at ?? raw.createdAt ?? raw.created_at ?? null,
        canonicalUrl: raw.canonicalUrl ?? raw.canonical_url ?? null,
        externalId: raw.externalId ?? raw.external_id ?? null,
        status: raw.status ?? null,
        source,
        categories,
        createdAt: raw.createdAt ?? raw.created_at ?? null,
        updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    };
};

export async function fetchNews(query: NewsQuery): Promise<PageResponse<NewsItem>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.set(key, String(value));
        }
    });

    const response = await apiFetch(`/api/news?${params.toString()}`, {
        errorMessage: "Haberler yuklenemedi.",
    });
    const raw = (await response.json()) as RawPageResponse<RawNewsItem>;
    const pageMeta = raw.page ?? {};

    const number = raw.number ?? pageMeta.number ?? 0;
    const size = raw.size ?? pageMeta.size ?? query.size ?? 20;
    const totalPages = raw.totalPages ?? pageMeta.totalPages ?? 0;
    const totalElements = raw.totalElements ?? pageMeta.totalElements ?? 0;

    return {
        content: (raw.content ?? []).map(normalizeNewsItem),
        number,
        size,
        totalPages,
        totalElements,
        first: raw.first ?? number <= 0,
        last: raw.last ?? (totalPages <= 1 || number >= totalPages - 1),
    };
}

export async function fetchNewsById(id: number): Promise<NewsItem> {
    const response = await apiFetch(`/api/news/${id}`, {
        errorMessage: "Haber detayi yuklenemedi.",
    });
    const raw = (await response.json()) as RawNewsItem;
    return normalizeNewsItem(raw);
}

export async function fetchCategories(activeOnly = true): Promise<NewsCategory[]> {
    const params = new URLSearchParams();
    params.set('activeOnly', String(activeOnly));

    const response = await apiFetch(`/api/categories?${params.toString()}`, {
        errorMessage: "Kategoriler yuklenemedi.",
    });
    return response.json() as Promise<NewsCategory[]>;
}

type RawGoogleNewsItem = {
    title?: string | null;
    description?: string | null;
    link?: string | null;
    publishedAt?: string | null;
    sourceName?: string | null;
    sourceUrl?: string | null;
};

const normalizeGoogleNewsItem = (raw: RawGoogleNewsItem): GoogleNewsItem => ({
    title: raw.title ?? "",
    description: raw.description ?? "",
    link: raw.link ?? "",
    publishedAt: raw.publishedAt ?? null,
    sourceName: raw.sourceName ?? null,
    sourceUrl: raw.sourceUrl ?? null,
});

export async function fetchGoogleNewsRss(
    query: string,
    options?: { hl?: string; gl?: string; ceid?: string; limit?: number }
): Promise<GoogleNewsItem[]> {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("hl", options?.hl ?? "tr");
    params.set("gl", options?.gl ?? "TR");
    params.set("ceid", options?.ceid ?? "TR:tr");
    params.set("limit", String(options?.limit ?? 8));

    const response = await apiFetch(`/api/news/google-rss/search?${params.toString()}`, {
        errorMessage: "Enstrumana ozel haberler yuklenemedi.",
    });

    const raw = (await response.json()) as RawGoogleNewsItem[];
    if (!Array.isArray(raw)) {
        throw new Error("Enstrumana ozel haberler icin gecersiz API cevabi alindi.");
    }

    return raw
        .map(normalizeGoogleNewsItem)
        .filter((item) => item.title.trim().length > 0 && item.link.trim().length > 0);
}
