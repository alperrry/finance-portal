import type { NewsItem } from "../api/newsApi";

export const PAGE_SIZE = 9;

export type NewsTag = { key: string; label: string };

export const TOPIC_TAG_RULES: Array<{ label: string; pattern: RegExp }> = [
    { label: "Doviz", pattern: /\b(dolar|euro|sterlin|usd|eur|kur|doviz)\b/i },
    { label: "Altin", pattern: /\b(altin|ons|gram altin|ceyrek)\b/i },
    { label: "Kripto Para", pattern: /\b(kripto|bitcoin|ethereum|btc|eth)\b/i },
    { label: "Hisse", pattern: /\b(borsa|bist|hisse|halka arz|endeks)\b/i },
    { label: "TCMB", pattern: /\b(tcmb|merkez bankasi|faiz karari|ppk)\b/i },
    { label: "Tahvil/Bono", pattern: /\b(tahvil|bono|eurobond)\b/i },
    { label: "Emtia", pattern: /\b(emtia|petrol|brent|dogalgaz)\b/i },
    { label: "Genel Ekonomi", pattern: /\b(enflasyon|ihracat|ithalat|cari acik|gsyh|ekonomi)\b/i },
];

export const GENERIC_CATEGORY_NAMES = new Set(["genel", "diger", "uncategorized"]);

export function normalizeForTagDetection(value: string) {
    return value
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c");
}

export function createExcerpt(text: string, maxLength: number) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
}

export function formatDate(value: string | null, dateStyle: "medium" | "full" = "medium") {
    if (!value) return "Tarih yok";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Tarih yok";
    return new Intl.DateTimeFormat("tr-TR", { dateStyle, timeStyle: "short" }).format(date);
}

export function formatTopClock(value: Date) {
    return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(value);
}

export function buildDynamicTags(news: NewsItem, maxTags = 3) {
    const explicitCategories = (news.categories ?? []).filter((category) => {
        const normalizedName = normalizeForTagDetection(category.name).trim();
        return normalizedName.length > 0 && !GENERIC_CATEGORY_NAMES.has(normalizedName);
    });

    if (explicitCategories.length > 0) {
        return explicitCategories.slice(0, maxTags).map((category) => ({
            key: `category-${category.id}`,
            label: category.name,
        }));
    }

    const text = normalizeForTagDetection(`${news.title ?? ""} ${news.context ?? ""}`);
    const derivedTags = TOPIC_TAG_RULES.filter((rule) => rule.pattern.test(text))
        .slice(0, maxTags)
        .map((rule) => ({ key: `derived-${rule.label}`, label: rule.label }));

    if (derivedTags.length > 0) return derivedTags;

    const fallbackTags: Array<{ key: string; label: string }> = [];
    if (news.source?.name) fallbackTags.push({ key: `source-${news.source.name}`, label: news.source.name });
    if (news.status && news.status.toLowerCase() !== "published") fallbackTags.push({ key: `status-${news.status}`, label: news.status });
    return fallbackTags.slice(0, maxTags);
}

export function buildPageItems(currentPage: number, totalPages: number) {
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
