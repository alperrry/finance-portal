import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { fetchNewsById } from "../api/news";
import type { NewsItem } from "../api/news";
import { KapitalShell } from "../components/layout";
import "./NewsPages.css";

type LoadState = {
    resolvedId: number | null;
    news: NewsItem | null;
    error: string | null;
};

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

const formatDate = (value: string | null) => {
    if (!value) return "Tarih yok";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Tarih yok";
    return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "full",
        timeStyle: "short",
    }).format(date);
};

const buildDynamicTags = (news: NewsItem) => {
    const explicitCategories = (news.categories ?? []).filter((category) => {
        const normalizedName = normalizeForTagDetection(category.name).trim();
        return normalizedName.length > 0 && !GENERIC_CATEGORY_NAMES.has(normalizedName);
    });

    if (explicitCategories.length > 0) {
        return explicitCategories.slice(0, 6).map((category) => ({
            key: `category-${category.id}`,
            label: category.name,
        }));
    }

    const text = normalizeForTagDetection(`${news.title ?? ""} ${news.context ?? ""}`);
    const derivedTags = TOPIC_TAG_RULES.filter((rule) => rule.pattern.test(text))
        .slice(0, 6)
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
    return fallbackTags;
};

export default function NewsDetail() {
    const { id } = useParams();

    const numericId = useMemo(() => (id ? Number(id) : NaN), [id]);
    const invalidId = !Number.isFinite(numericId);

    const [state, setState] = useState<LoadState>({
        resolvedId: null,
        news: null,
        error: null,
    });

    useEffect(() => {
        if (invalidId) return undefined;

        let active = true;
        fetchNewsById(numericId)
            .then((news) => {
                if (!active) return;
                setState({
                    resolvedId: numericId,
                    news,
                    error: null,
                });
            })
            .catch((error: Error) => {
                if (!active) return;
                setState({
                    resolvedId: numericId,
                    news: null,
                    error: error.message || "Haber detayi yuklenemedi.",
                });
            });

        return () => {
            active = false;
        };
    }, [invalidId, numericId]);

    const loading = !invalidId && state.resolvedId !== numericId;
    const news = state.resolvedId === numericId ? state.news : null;
    const error = state.resolvedId === numericId ? state.error : null;
    const detailTags = useMemo(() => (news ? buildDynamicTags(news) : []), [news]);

    return (
        <KapitalShell activePage="news">
            <div className="news-page">
                <div className="news-layout news-detail-layout">
                <section className="news-detail-header">
                    <div className="news-breadcrumbs">
                        <RouterLink to="/news">Haberler</RouterLink>
                        <span>/</span>
                        <span>Detay</span>
                    </div>
                </section>

                {invalidId && <div className="news-status-card error">Gecersiz haber kimligi.</div>}

                {loading && !invalidId && (
                    <section className="news-detail-grid">
                        <article className="news-article-card news-card-skeleton">
                            <div className="skeleton-line short" />
                            <div className="skeleton-line long" />
                            <div className="skeleton-line long" />
                            <div className="skeleton-line medium" />
                            <div className="skeleton-line long" />
                            <div className="skeleton-line long" />
                        </article>
                        <aside className="news-side-card news-card-skeleton">
                            <div className="skeleton-line medium" />
                            <div className="skeleton-line short" />
                            <div className="skeleton-line medium" />
                            <div className="skeleton-line short" />
                        </aside>
                    </section>
                )}

                {!loading && !invalidId && error && <div className="news-status-card error">{error}</div>}

                {!loading && !invalidId && !error && news && (
                    <section className="news-detail-grid">
                        <article className="news-article-card">
                            <div className="news-detail-badges">
                                <span className="news-tag">{news.source?.name ?? "Bilinmeyen Kaynak"}</span>
                                <span className="news-tag">{formatDate(news.publishedAt)}</span>
                            </div>

                            <h1 className="news-detail-title">{news.title}</h1>

                            <div className="news-detail-content">
                                {news.context ? (
                                    news.context.split("\n").map((paragraph, index) => (
                                        <p key={`${news.id}-paragraph-${index}`}>{paragraph}</p>
                                    ))
                                ) : (
                                    <p>Bu haber icin icerik bilgisi bulunamadi.</p>
                                )}
                            </div>

                            <div className="news-detail-actions">
                                <RouterLink className="news-link-btn secondary" to="/news">
                                    Listeye Don
                                </RouterLink>
                                {news.canonicalUrl ? (
                                    <a
                                        className="news-link-btn"
                                        href={news.canonicalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Kaynagi Ac
                                    </a>
                                ) : null}
                            </div>
                        </article>

                        <aside className="news-side-card">
                            <h2>Haber Ozet</h2>

                            <div className="news-side-block">
                                <div className="news-side-label">Kaynak</div>
                                <div className="news-side-value">{news.source?.name ?? "Bilinmeyen"}</div>
                            </div>

                            <div className="news-side-block">
                                <div className="news-side-label">Durum</div>
                                <div className="news-side-value">{news.status ?? "Yayinlandi"}</div>
                            </div>

                            <div className="news-side-block">
                                <div className="news-side-label">Kategoriler</div>
                                <div className="news-side-tags">
                                    {detailTags.length > 0 ? (
                                        detailTags.map((tag) => (
                                            <span key={`${news.id}-${tag.key}`} className="news-tag">
                                                {tag.label}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="news-side-value">Kategori bilgisi yok</span>
                                    )}
                                </div>
                            </div>

                        </aside>
                    </section>
                )}
                </div>
            </div>
        </KapitalShell>
    );
}
