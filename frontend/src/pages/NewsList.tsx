import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { fetchCategories, fetchNews } from "../api/news";
import type { NewsCategory, NewsItem, PageResponse } from "../api/news";
import { KapitalShell } from "../components/layout";
import "./NewsPages.css";

type LoadState = {
    resolvedKey: string;
    page: PageResponse<NewsItem> | null;
    error: string | null;
};

const PAGE_SIZE = 9;

const TOPIC_TAG_RULES: Array<{ label: string; pattern: RegExp }> = [
    { label: "Doviz", pattern: /\b(dolar|euro|sterlin|usd|eur|kur|doviz)\b/i },
    { label: "Altin", pattern: /\b(altin|ons|gram altin|ceyrek)\b/i },
    { label: "Kripto Para", pattern: /\b(kripto|bitcoin|ethereum|btc|eth)\b/i },
    { label: "Hisse", pattern: /\b(borsa|bist|hisse|halka arz|endeks)\b/i },
    { label: "TCMB", pattern: /\b(tcmb|merkez bankasi|faiz karari|ppk)\b/i },
    { label: "Tahvil/Bono", pattern: /\b(tahvil|bono|eurobond)\b/i },
    { label: "Emtia", pattern: /\b(emtia|petrol|brent|dogalgaz)\b/i },
    { label: "Genel Ekonomi", pattern: /\b(enflasyon|ihracat|ithalat|cari acik|gsyh|ekonomi)\b/i },
];

const GENERIC_CATEGORY_NAMES = new Set(["genel", "diger", "uncategorized"]);

const normalizeForTagDetection = (value: string) =>
    value
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c");

const createExcerpt = (text: string, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
};

const formatDate = (value: string | null) => {
    if (!value) return "Tarih yok";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Tarih yok";
    return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
};

const formatTopClock = (value: Date) =>
    new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);

const buildDynamicTags = (news: NewsItem) => {
    const explicitCategories = (news.categories ?? []).filter((category) => {
        const normalizedName = normalizeForTagDetection(category.name).trim();
        return normalizedName.length > 0 && !GENERIC_CATEGORY_NAMES.has(normalizedName);
    });

    if (explicitCategories.length > 0) {
        return explicitCategories.slice(0, 3).map((category) => ({
            key: `category-${category.id}`,
            label: category.name,
        }));
    }

    const text = normalizeForTagDetection(`${news.title ?? ""} ${news.context ?? ""}`);
    const derivedTags = TOPIC_TAG_RULES.filter((rule) => rule.pattern.test(text))
        .slice(0, 3)
        .map((rule) => ({
            key: `derived-${rule.label}`,
            label: rule.label,
        }));

    if (derivedTags.length > 0) {
        return derivedTags;
    }

    const fallbackTags: Array<{ key: string; label: string }> = [];
    if (news.source?.name) {
        fallbackTags.push({
            key: `source-${news.source.name}`,
            label: news.source.name,
        });
    }
    if (news.status && news.status.toLowerCase() !== "published") {
        fallbackTags.push({
            key: `status-${news.status}`,
            label: news.status,
        });
    }
    return fallbackTags.slice(0, 3);
};

function buildPageItems(currentPage: number, totalPages: number) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | string> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) items.push("dots-left");
    for (let page = start; page <= end; page += 1) items.push(page);
    if (end < totalPages - 1) items.push("dots-right");

    items.push(totalPages);
    return items;
}

export default function NewsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryFromUrl = searchParams.get("category") ?? "";
    const selectedCategoryId = /^\d+$/.test(categoryFromUrl) ? categoryFromUrl : "";

    const [pageIndex, setPageIndex] = useState(1);
    const [reloadToken, setReloadToken] = useState(0);
    const [categories, setCategories] = useState<NewsCategory[]>([]);
    const [state, setState] = useState<LoadState>({
        resolvedKey: "",
        page: null,
        error: null,
    });

    const now = useMemo(() => new Date(), []);
    const navClock = useMemo(() => formatTopClock(now), [now]);

    const requestKey = `${pageIndex}-${selectedCategoryId}-${reloadToken}`;

    useEffect(() => {
        let active = true;

        fetchNews({
            page: pageIndex - 1,
            size: PAGE_SIZE,
            sortBy: "createdAt",
            direction: "DESC",
            categoryId: selectedCategoryId === "" ? undefined : Number(selectedCategoryId),
        })
            .then((page) => {
                if (!active) return;
                setState({
                    resolvedKey: requestKey,
                    page,
                    error: null,
                });
            })
            .catch((error: Error) => {
                if (!active) return;
                setState({
                    resolvedKey: requestKey,
                    page: null,
                    error: error.message || "Haberler yuklenemedi.",
                });
            });

        return () => {
            active = false;
        };
    }, [pageIndex, requestKey, selectedCategoryId]);

    useEffect(() => {
        let active = true;

        fetchCategories(true)
            .then((data) => {
                if (!active) return;
                setCategories(data);
            })
            .catch(() => {
                if (!active) return;
                setCategories([]);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const resetTimer = window.setTimeout(() => setPageIndex(1), 0);
        return () => window.clearTimeout(resetTimer);
    }, [selectedCategoryId]);

    const applyCategoryFilter = (categoryId: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (categoryId) {
            nextParams.set("category", categoryId);
        } else {
            nextParams.delete("category");
        }
        setSearchParams(nextParams, { replace: true });
    };

    const loading = state.resolvedKey !== requestKey;
    const pageData = state.resolvedKey === requestKey ? state.page : null;
    const error = state.resolvedKey === requestKey ? state.error : null;

    const cards = useMemo(() => pageData?.content ?? [], [pageData]);
    const totalPages = pageData?.totalPages ?? 0;
    const totalElements = pageData?.totalElements ?? 0;

    const pageItems = useMemo(() => buildPageItems(pageIndex, totalPages), [pageIndex, totalPages]);

    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return "Tum kategoriler";
        return categories.find((category) => String(category.id) === selectedCategoryId)?.name ?? "Kategori";
    }, [categories, selectedCategoryId]);

    return (
        <KapitalShell activePage="news" selectedCategoryId={selectedCategoryId}>
            <div className="news-page">
                <div className="news-layout">
                <section className="news-hero">
                    <div>
                        <div className="news-kicker">Canli Haber Akisi</div>
                        <h1 className="news-title-main">Finans Haber Merkezi</h1>
                        <p className="news-subtitle">
                            Piyasalardaki son gelismeleri tek panelde takip edin. Kaynaga bagli detay, kategori bazli
                            filtreleme ve hizli erisimle akisi yonetin.
                        </p>
                    </div>

                    <div className="news-stats">
                        <div className="news-stat-card">
                            <div className="news-stat-label">Toplam Haber</div>
                            <div className="news-stat-value">{loading ? "..." : totalElements}</div>
                        </div>
                        <div className="news-stat-card">
                            <div className="news-stat-label">Secili Kategori</div>
                            <div className="news-stat-value small">{selectedCategoryName}</div>
                        </div>
                        <div className="news-stat-card">
                            <div className="news-stat-label">Son Kontrol</div>
                            <div className="news-stat-value">{navClock}</div>
                        </div>
                    </div>
                </section>

                <section className="news-toolbar">
                    <label className="news-filter-field" htmlFor="news-category-filter">
                        <span>Kategori</span>
                        <select
                            id="news-category-filter"
                            value={selectedCategoryId}
                            onChange={(event) => {
                                applyCategoryFilter(event.target.value);
                                setPageIndex(1);
                            }}
                        >
                            <option value="">Tum kategoriler</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button className="news-refresh-btn" type="button" onClick={() => setReloadToken((token) => token + 1)}>
                        Yenile
                    </button>
                </section>

                {loading && (
                    <section className="news-grid">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <article key={`skeleton-${index}`} className="news-card news-card-skeleton">
                                <div className="skeleton-line short" />
                                <div className="skeleton-line medium" />
                                <div className="skeleton-line medium" />
                                <div className="skeleton-line long" />
                                <div className="skeleton-line long" />
                                <div className="skeleton-line short" />
                            </article>
                        ))}
                    </section>
                )}

                {!loading && error && <div className="news-status-card error">{error}</div>}

                {!loading && !error && cards.length === 0 && (
                    <div className="news-status-card empty">Bu filtreye uygun haber bulunamadi.</div>
                )}

                {!loading && !error && cards.length > 0 && (
                    <section className="news-grid">
                        {cards.map((news) => {
                            const tagsForCard = buildDynamicTags(news);

                            return (
                                <article key={news.id} className="news-card">
                                    {news.imageUrl ? (
                                        <img
                                            className="news-card-image"
                                            src={news.imageUrl}
                                            alt=""
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                            onError={(event) => {
                                                event.currentTarget.hidden = true;
                                            }}
                                        />
                                    ) : null}
                                    <div className="news-card-meta">
                                        <span className="news-meta-source">{news.source?.name ?? "Bilinmeyen Kaynak"}</span>
                                        <span className="news-meta-date">{formatDate(news.publishedAt)}</span>
                                    </div>

                                    <h2 className="news-card-title">{news.title}</h2>

                                    <p className="news-card-excerpt">{createExcerpt(news.context, 180)}</p>

                                    {tagsForCard.length > 0 ? (
                                        <div className="news-card-tags">
                                            {tagsForCard.map((tag) => (
                                                <span key={`${news.id}-${tag.key}`} className="news-tag">
                                                    {tag.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div className="news-card-actions">
                                        <RouterLink className="news-link-btn" to={`/news/${news.id}`}>
                                            Detayi Ac
                                        </RouterLink>
                                        {news.canonicalUrl ? (
                                            <a
                                                className="news-link-btn secondary"
                                                href={news.canonicalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Kaynak
                                            </a>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}

                {!loading && !error && totalPages > 1 && (
                    <section className="news-pagination-wrap">
                        <div className="news-pagination">
                            <button
                                className="news-page-btn"
                                type="button"
                                disabled={pageIndex <= 1}
                                onClick={() => setPageIndex((value) => Math.max(1, value - 1))}
                            >
                                Onceki
                            </button>

                            {pageItems.map((item, index) =>
                                typeof item === "number" ? (
                                    <button
                                        key={item}
                                        className={`news-page-btn ${pageIndex === item ? "active" : ""}`}
                                        type="button"
                                        onClick={() => setPageIndex(item)}
                                    >
                                        {item}
                                    </button>
                                ) : (
                                    <span key={`${item}-${index}`} className="news-page-dots">
                                        ...
                                    </span>
                                ),
                            )}

                            <button
                                className="news-page-btn"
                                type="button"
                                disabled={pageIndex >= totalPages}
                                onClick={() => setPageIndex((value) => Math.min(totalPages, value + 1))}
                            >
                                Sonraki
                            </button>
                        </div>

                        <div className="news-pagination-meta">Toplam {totalElements} haber</div>
                    </section>
                )}
                </div>
            </div>
        </KapitalShell>
    );
}
