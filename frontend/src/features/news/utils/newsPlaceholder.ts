import type { NewsItem } from "../api/newsApi";

/**
 * Görseli olmayan (veya görseli kırık olan) haberler için, kategoriye göre temalı
 * bir SVG placeholder üretir. Dosya indirme / ağ isteği yoktur; sonuç bir data-URI'dir.
 * Seçim deterministiktir (aynı haber/kategori hep aynı görseli alır).
 */

// Bilinen kategori adlarına sabit renk çiftleri (koyu → açık gradient).
const CATEGORY_COLORS: Record<string, [string, string]> = {
    "hisse": ["#1e3a8a", "#3b82f6"],
    "döviz": ["#065f46", "#10b981"],
    "emtia": ["#7c2d12", "#ea580c"],
    "altın": ["#854d0e", "#eab308"],
    "kripto para": ["#581c87", "#a855f7"],
    "tahvil/bono": ["#134e4a", "#14b8a6"],
    "genel ekonomi": ["#1e293b", "#475569"],
    "politika": ["#7f1d1d", "#dc2626"],
    "tcmb": ["#0c4a6e", "#0ea5e9"],
};

function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function colorsFor(seedLabel: string): [string, string] {
    const key = seedLabel.trim().toLowerCase();
    if (CATEGORY_COLORS[key]) return CATEGORY_COLORS[key];
    const hue = hashString(key) % 360;
    return [`hsl(${hue} 55% 26%)`, `hsl(${(hue + 30) % 360} 60% 44%)`];
}

function escapeXml(value: string): string {
    return value.replace(/[<>&'"]/g, (char) => {
        switch (char) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "'": return "&apos;";
            default: return "&quot;";
        }
    });
}

export function buildNewsPlaceholder(news: NewsItem): string {
    const category = news.categories?.[0]?.name ?? null;
    const seed = category ?? news.source?.name ?? String(news.id ?? "haber");
    const label = (category ?? news.source?.name ?? "HABER").toUpperCase();
    const [from, to] = colorsFor(seed);
    const offset = (news.id ?? 0) % 24;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice">`
        + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
        + `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`
        + `<rect width="400" height="160" fill="url(#g)"/>`
        + `<circle cx="${320 + offset}" cy="34" r="78" fill="#ffffff" opacity="0.07"/>`
        + `<circle cx="48" cy="150" r="56" fill="#000000" opacity="0.08"/>`
        + `<text x="26" y="92" font-family="Sora, Inter, Arial, sans-serif" font-size="21" font-weight="800" letter-spacing="1.2" fill="#ffffff" opacity="0.94">${escapeXml(label)}</text>`
        + `</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
