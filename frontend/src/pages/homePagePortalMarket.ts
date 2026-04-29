import type {
    LandingMarketDirection,
    LandingMarketItemResponse,
    LandingMarketSnapshotResponse,
} from "../api/landing";

const HERO_FEED_ID = "kp-hero-live-feed";
const MARKET_GRID_ID = "kp-market-live-grid";

const DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
});

const NUMBER_FORMATTERS = {
    fx: new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    }),
    price: new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }),
    percent: new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }),
};

const SPARKLINES: Record<LandingMarketDirection, { area: string; line: string; gradient: string }> = {
    up: {
        area: "M0,34 C20,30 35,32 55,22 C70,14 90,18 110,10 C130,4 145,8 160,2 L160,44 L0,44 Z",
        line: "M0,34 C20,30 35,32 55,22 C70,14 90,18 110,10 C130,4 145,8 160,2",
        gradient: "#5BB870",
    },
    down: {
        area: "M0,8 C25,12 40,10 60,16 C80,22 100,18 120,26 C135,32 148,30 160,36 L160,44 L0,44 Z",
        line: "M0,8 C25,12 40,10 60,16 C80,22 100,18 120,26 C135,32 148,30 160,36",
        gradient: "#E05858",
    },
    neutral: {
        area: "M0,22 C20,20 40,23 60,21 C80,20 100,23 120,21 C140,19 150,21 160,20 L160,44 L0,44 Z",
        line: "M0,22 C20,20 40,23 60,21 C80,20 100,23 120,21 C140,19 150,21 160,20",
        gradient: "#C1622F",
    },
};

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatDate(value: string | null) {
    if (!value) return "Bekleniyor";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Bekleniyor";

    return DATE_FORMATTER.format(date);
}

function formatDateTime(value: string | null) {
    if (!value) return "Bekleniyor";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Bekleniyor";

    return DATE_TIME_FORMATTER.format(date);
}

function getCurrencyPrefix(currency: string | null) {
    if (currency === "TRY") return "₺";
    if (currency === "USD") return "$";
    if (currency === "EUR") return "€";
    return "";
}

function formatPrice(item: LandingMarketItemResponse) {
    if (typeof item.price !== "number" || !Number.isFinite(item.price)) {
        return "Veri bekleniyor";
    }

    if (item.instrumentType === "fx") {
        return NUMBER_FORMATTERS.fx.format(item.price);
    }

    return `${getCurrencyPrefix(item.currency)}${NUMBER_FORMATTERS.price.format(item.price)}`;
}

function formatHeroPrice(item: LandingMarketItemResponse) {
    const price = formatPrice(item);

    if (item.changePercent === null || item.direction === "neutral") {
        return price;
    }

    const arrow = item.direction === "up" ? "▲" : "▼";
    return `${arrow} ${price}`;
}

function formatChangeBadge(item: LandingMarketItemResponse) {
    if (item.changePercent === null) {
        return "TCMB";
    }

    const sign = item.changePercent > 0 ? "+" : "";
    const arrow = item.direction === "up" ? "▲" : item.direction === "down" ? "▼" : "•";
    return `${arrow} ${sign}${NUMBER_FORMATTERS.percent.format(item.changePercent)}%`;
}

function formatMarketSubtitle(item: LandingMarketItemResponse) {
    if (item.instrumentType === "fx") {
        return `${item.marketLabel} • ${formatDate(item.dataDate)}`;
    }

    return item.fetchedAt
        ? `${item.marketLabel} • ${formatDateTime(item.fetchedAt)}`
        : `${item.marketLabel} • ${formatDate(item.dataDate)}`;
}

function renderHeroCard(item: LandingMarketItemResponse, index: number) {
    const pulseClass = item.direction === "neutral" ? "live-pulse neutral" : "live-pulse";
    const pulseStyle = item.direction === "down"
        ? ` style="background:#E05858;animation-delay:${index * 0.4}s"`
        : ` style="animation-delay:${index * 0.4}s"`;

    return `<div class="live-card">
    <div class="${pulseClass}"${pulseStyle}></div>
    <span class="lc-name">${escapeHtml(item.symbol)}</span>
    <span class="lc-price lc-${item.direction}">${escapeHtml(formatHeroPrice(item))}</span>
  </div>`;
}

function renderMarketCard(item: LandingMarketItemResponse, index: number) {
    const direction = item.direction ?? "neutral";
    const sparkline = SPARKLINES[direction];
    const gradientId = `kp-spark-${direction}-${index}`;

    return `<div class="mcard ${direction} visible" data-delay="${index * 80}">
    <div class="mc-top">
      <div>
        <div class="mc-name">${escapeHtml(item.symbol)}</div>
        <div class="mc-full">${escapeHtml(item.name)}</div>
      </div>
      <div class="mc-badge ${direction}">${escapeHtml(formatChangeBadge(item))}</div>
    </div>
    <div class="mc-price">${escapeHtml(formatPrice(item))}</div>
    <div class="mc-sub">${escapeHtml(formatMarketSubtitle(item))}</div>
    <svg class="mc-spark" viewBox="0 0 160 44" preserveAspectRatio="none">
      <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${sparkline.gradient}" stop-opacity=".18"/><stop offset="100%" stop-color="${sparkline.gradient}" stop-opacity="0"/></linearGradient></defs>
      <path d="${sparkline.area}" fill="url(#${gradientId})"/>
      <path d="${sparkline.line}" fill="none" stroke="${sparkline.gradient}" stroke-width="1.6"/>
    </svg>
  </div>`;
}

function renderFallbackState() {
    return `<div class="mcard neutral visible">
    <div class="mc-top">
      <div>
        <div class="mc-name">Canlı Veri</div>
        <div class="mc-full">Piyasa özeti hazırlanıyor</div>
      </div>
      <div class="mc-badge neutral">Bekleniyor</div>
    </div>
    <div class="mc-price">Veri bekleniyor</div>
    <div class="mc-sub">Backend snapshot henüz hazır değil</div>
    <svg class="mc-spark" viewBox="0 0 160 44" preserveAspectRatio="none">
      <defs><linearGradient id="kp-spark-fallback" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C1622F" stop-opacity=".18"/><stop offset="100%" stop-color="#C1622F" stop-opacity="0"/></linearGradient></defs>
      <path d="${SPARKLINES.neutral.area}" fill="url(#kp-spark-fallback)"/>
      <path d="${SPARKLINES.neutral.line}" fill="none" stroke="#C1622F" stroke-width="1.6"/>
    </svg>
  </div>`;
}

export function renderPortalMarketSnapshot(document: Document, snapshot: LandingMarketSnapshotResponse) {
    const heroFeed = document.getElementById(HERO_FEED_ID);
    const marketGrid = document.getElementById(MARKET_GRID_ID);

    if (!heroFeed || !marketGrid) {
        return;
    }

    const heroItems = snapshot.heroItems.length > 0 ? snapshot.heroItems : snapshot.marketItems.slice(0, 4);
    const marketItems = snapshot.marketItems;

    heroFeed.innerHTML = heroItems.length > 0
        ? heroItems.map((item, index) => renderHeroCard(item, index)).join("")
        : `<div class="live-card"><div class="live-pulse neutral"></div><span class="lc-name">Canlı veri</span><span class="lc-price lc-neutral">Bekleniyor</span></div>`;

    marketGrid.innerHTML = marketItems.length > 0
        ? marketItems.map((item, index) => renderMarketCard(item, index)).join("")
        : renderFallbackState();
}
