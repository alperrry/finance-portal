import type { BondResponse, FundResponse, FxResponse, StockResponse } from "../api/marketApi";
import type { MarketSortState, MarketTab, MarketData, SummaryCard } from "../types";
import {
    toSafeNumber,
    formatNumber,
    formatWholeNumber,
    formatCompactNumber,
    formatCompactMoney,
    formatMoney,
    formatRate,
    formatLocalDate,
    formatUnitLabel,
    formatPercent,
} from "./marketFormatters";

const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });

export const normalizeSearch = (value: string) =>
    value
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c");

export const compareNullableNumbersAsc = (left: number | null | undefined, right: number | null | undefined) => {
    const l = toSafeNumber(left);
    const r = toSafeNumber(right);

    if (l === null && r === null) return 0;
    if (l === null) return 1;
    if (r === null) return -1;

    return l - r;
};

export const compareNullableNumbersDesc = (left: number | null | undefined, right: number | null | undefined) => {
    const l = toSafeNumber(left);
    const r = toSafeNumber(right);

    if (l === null && r === null) return 0;
    if (l === null) return 1;
    if (r === null) return -1;

    return r - l;
};

export const compareNullableStringsAsc = (left: string | null | undefined, right: string | null | undefined) => {
    const l = left?.trim() ?? "";
    const r = right?.trim() ?? "";

    if (!l && !r) return 0;
    if (!l) return 1;
    if (!r) return -1;

    return collator.compare(l, r);
};

const toTimestamp = (value: string | null | undefined): number | null => {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? null : ts;
};

const compareNullableDatesAsc = (left: string | null | undefined, right: string | null | undefined) =>
    compareNullableNumbersAsc(toTimestamp(left), toTimestamp(right));

const applySortDirection = (result: number, direction: "asc" | "desc") => (direction === "asc" ? result : -result);

export const getFxSpread = (item: FxResponse): number | null => {
    const buying = toSafeNumber(item.forexBuying);
    const selling = toSafeNumber(item.forexSelling);

    if (buying === null || selling === null) return null;
    return selling - buying;
};

const latestStringValue = (values: Array<string | null | undefined>) =>
    values.filter((v): v is string => Boolean(v)).sort(collator.compare).at(-1) ?? null;

const compareFxPairAsc = (left: FxResponse, right: FxResponse) => {
    const PRIORITY = ["USD", "EUR", "GBP", "CHF", "SAR", "KWD", "JPY"];
    const li = PRIORITY.indexOf(left.currencyCode);
    const ri = PRIORITY.indexOf(right.currencyCode);

    if (li >= 0 || ri >= 0) {
        if (li < 0) return 1;
        if (ri < 0) return -1;
        return li - ri;
    }

    return collator.compare(left.currencyCode, right.currencyCode);
};

export function sortFxRows(rows: FxResponse[], sortConfig: MarketSortState["fx"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "pair":   result = compareFxPairAsc(l, r); break;
            case "name":   result = compareNullableStringsAsc(l.currencyName, r.currencyName); break;
            case "buying": result = compareNullableNumbersAsc(l.forexBuying, r.forexBuying); break;
            case "selling":result = compareNullableNumbersAsc(l.forexSelling, r.forexSelling); break;
            case "spread": result = compareNullableNumbersAsc(getFxSpread(l), getFxSpread(r)); break;
            case "date":   result = compareNullableDatesAsc(l.rateDate, r.rateDate); break;
            default:       result = compareFxPairAsc(l, r);
        }

        if (result === 0) result = compareFxPairAsc(l, r);
        return applySortDirection(result, sortConfig.direction);
    });
}

export function sortBondRows(rows: BondResponse[], sortConfig: MarketSortState["bonds"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "instrument": result = compareNullableStringsAsc(l.name, r.name); break;
            case "type":       result = compareNullableStringsAsc(l.bondType, r.bondType); break;
            case "maturity":   result = compareNullableNumbersAsc(l.maturityDays, r.maturityDays); break;
            case "interest":   result = compareNullableNumbersAsc(l.interestRate, r.interestRate); break;
            case "compounded": result = compareNullableNumbersAsc(l.compoundedRate, r.compoundedRate); break;
            case "currency":   result = compareNullableStringsAsc(l.currency, r.currency); break;
            case "date":       result = compareNullableDatesAsc(l.rateDate, r.rateDate); break;
            default:           result = compareNullableStringsAsc(l.name, r.name);
        }

        if (result === 0) result = compareNullableStringsAsc(l.name, r.name);
        return applySortDirection(result, sortConfig.direction);
    });
}

export function sortFundRows(rows: FundResponse[], sortConfig: MarketSortState["funds"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "fund":          result = compareNullableStringsAsc(l.code, r.code); break;
            case "type":          result = compareNullableStringsAsc(l.fundType, r.fundType); break;
            case "price":         result = compareNullableNumbersAsc(l.price, r.price); break;
            case "investors":     result = compareNullableNumbersAsc(l.investorCount, r.investorCount); break;
            case "portfolioSize": result = compareNullableNumbersAsc(l.portfolioSize, r.portfolioSize); break;
            case "shares":        result = compareNullableNumbersAsc(l.totalShares, r.totalShares); break;
            case "date":          result = compareNullableDatesAsc(l.priceDate, r.priceDate); break;
            default:              result = compareNullableStringsAsc(l.code, r.code);
        }

        if (result === 0) result = compareNullableStringsAsc(l.code, r.code);
        return applySortDirection(result, sortConfig.direction);
    });
}

function getStockRangeWidth(row: StockResponse): number | null {
    const high = toSafeNumber(row.fiftyTwoWeekHigh);
    const low = toSafeNumber(row.fiftyTwoWeekLow);

    if (high === null || low === null) return null;
    return high - low;
}

export function sortStockRows(rows: StockResponse[], sortConfig: MarketSortState["stocks"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "stock":     result = compareNullableStringsAsc(l.symbol, r.symbol); break;
            case "sector":    result = compareNullableStringsAsc(l.sector ?? l.indexName, r.sector ?? r.indexName); break;
            case "price":     result = compareNullableNumbersAsc(l.price, r.price); break;
            case "change":
                result = compareNullableNumbersAsc(l.changePercent, r.changePercent);
                if (result === 0) result = compareNullableNumbersAsc(l.change, r.change);
                break;
            case "volume":    result = compareNullableNumbersAsc(l.volume, r.volume); break;
            case "marketCap": result = compareNullableNumbersAsc(l.marketCap, r.marketCap); break;
            case "range52w":  result = compareNullableNumbersAsc(getStockRangeWidth(l), getStockRangeWidth(r)); break;
            case "fetchedAt":
                result = compareNullableDatesAsc(l.fetchedAt, r.fetchedAt);
                if (result === 0) result = compareNullableDatesAsc(l.tradeDate, r.tradeDate);
                break;
            default:          result = compareNullableStringsAsc(l.symbol, r.symbol);
        }

        if (result === 0) result = compareNullableStringsAsc(l.symbol, r.symbol);
        return applySortDirection(result, sortConfig.direction);
    });
}

export const matchesSearch = (query: string, ...fields: Array<string | null | undefined>): boolean => {
    if (!query) return true;
    const nq = normalizeSearch(query);
    return fields.some((f) => normalizeSearch(f ?? "").includes(nq));
};

export function dedupeStocksByLatestSnapshot(rows: StockResponse[]): StockResponse[] {
    const latestBySymbol = new Map<string, StockResponse>();

    rows.forEach((row) => {
        const current = latestBySymbol.get(row.symbol);
        if (!current) {
            latestBySymbol.set(row.symbol, row);
            return;
        }

        const currentTime = current.fetchedAt ? new Date(current.fetchedAt).getTime() : 0;
        const nextTime = row.fetchedAt ? new Date(row.fetchedAt).getTime() : 0;

        if (nextTime > currentTime) {
            latestBySymbol.set(row.symbol, row);
            return;
        }

        if (nextTime === currentTime && (row.tradeDate ?? "") >= (current.tradeDate ?? "")) {
            latestBySymbol.set(row.symbol, row);
        }
    });

    return [...latestBySymbol.values()];
}

export function buildFxMarketCards(rows: FxResponse[]): SummaryCard[] {
    const usd = rows.find((r) => r.currencyCode === "USD");
    const eur = rows.find((r) => r.currencyCode === "EUR");
    const narrowest = [...rows]
        .filter((r) => getFxSpread(r) !== null)
        .sort((l, r) => compareNullableNumbersAsc(getFxSpread(l), getFxSpread(r)))[0];

    return [
        {
            label: "USD/TRY satis",
            value: formatRate(usd?.forexSelling),
            note: usd ? `${formatLocalDate(usd.rateDate)} · ${formatUnitLabel(usd.unit, usd.currencyCode)}` : "Veri yok",
        },
        {
            label: "EUR/TRY satis",
            value: formatRate(eur?.forexSelling),
            note: eur ? `${formatLocalDate(eur.rateDate)} · ${formatUnitLabel(eur.unit, eur.currencyCode)}` : "Veri yok",
        },
        {
            label: "En dar makas",
            value: narrowest ? formatRate(getFxSpread(narrowest)) : "-",
            note: narrowest
                ? `${formatUnitLabel(narrowest.unit, narrowest.currencyCode)} · ${narrowest.currencyName}`
                : "Veri yok",
        },
    ];
}

export function buildBondMarketCards(rows: BondResponse[]): SummaryCard[] {
    const highestInterest = [...rows].sort((l, r) => compareNullableNumbersDesc(l.interestRate, r.interestRate))[0];
    const highestCompounded = [...rows].sort((l, r) => compareNullableNumbersDesc(l.compoundedRate, r.compoundedRate))[0];
    const shortestMaturity = [...rows].sort((l, r) => compareNullableNumbersAsc(l.maturityDays, r.maturityDays))[0];

    return [
        {
            label: "En yuksek faiz",
            value: highestInterest?.interestRate != null ? `%${formatNumber(highestInterest.interestRate, 2)}` : "-",
            note: highestInterest ? highestInterest.name : "Veri yok",
        },
        {
            label: "En yuksek bileşik",
            value: highestCompounded?.compoundedRate != null ? `%${formatNumber(highestCompounded.compoundedRate, 2)}` : "-",
            note: highestCompounded ? highestCompounded.name : "Veri yok",
        },
        {
            label: "En kisa vade",
            value: shortestMaturity?.maturityDays != null ? `${formatWholeNumber(shortestMaturity.maturityDays)} gun` : "-",
            note: shortestMaturity ? shortestMaturity.name : "Veri yok",
        },
    ];
}

export function buildFundMarketCards(rows: FundResponse[]): SummaryCard[] {
    const bySize = [...rows].sort((l, r) => compareNullableNumbersDesc(l.portfolioSize, r.portfolioSize))[0];
    const byInvestors = [...rows].sort((l, r) => compareNullableNumbersDesc(l.investorCount, r.investorCount))[0];
    const averagePrice =
        rows.length > 0 ? rows.reduce((sum, r) => sum + (toSafeNumber(r.price) ?? 0), 0) / rows.length : null;

    return [
        {
            label: "En buyuk portfoy",
            value: bySize ? formatCompactMoney(bySize.portfolioSize, "TRY") : "-",
            note: bySize ? `${bySize.code} · ${bySize.name}` : "Veri yok",
        },
        {
            label: "En cok yatirimci",
            value: byInvestors ? formatCompactNumber(byInvestors.investorCount) : "-",
            note: byInvestors ? `${byInvestors.code} · ${byInvestors.name}` : "Veri yok",
        },
        {
            label: "Ortalama fiyat",
            value: averagePrice === null ? "-" : formatMoney(averagePrice, "TRY", 4),
            note: rows.length > 0 ? `${formatWholeNumber(rows.length)} fon kaydi` : "Veri yok",
        },
    ];
}

export function buildStockMarketCards(rows: StockResponse[]): SummaryCard[] {
    if (rows.length === 0) {
        return [
            { label: "Hisse verisi", value: "Veri yok", note: "Seans disi veya hafta sonu olabilir." },
            { label: "Guncelleme", value: "-", note: "Yeni fiyat gelince otomatik olarak page refresh ile alinabilir." },
            { label: "Durum", value: "Bekleniyor", note: "Bos liste backend contract'ina uygun bir durumdur." },
        ];
    }

    const topGainer = [...rows].sort((l, r) => compareNullableNumbersDesc(l.changePercent, r.changePercent))[0];
    const topVolume = [...rows].sort((l, r) => compareNullableNumbersDesc(l.volume, r.volume))[0];
    const topMarketCap = [...rows].sort((l, r) => compareNullableNumbersDesc(l.marketCap, r.marketCap))[0];

    return [
        {
            label: "Gun lideri",
            value: formatPercent(topGainer?.changePercent),
            note: topGainer ? `${topGainer.symbol} · ${formatMoney(topGainer.price, topGainer.currency ?? "TRY")}` : "Veri yok",
            tone: toSafeNumber(topGainer?.changePercent) !== null && (topGainer?.changePercent ?? 0) < 0 ? "down" : "up",
        },
        {
            label: "En yuksek hacim",
            value: topVolume ? formatCompactNumber(topVolume.volume) : "-",
            note: topVolume ? `${topVolume.symbol} · ${topVolume.shortName ?? topVolume.longName ?? "Hisse"}` : "Veri yok",
        },
        {
            label: "Piyasa degeri lideri",
            value: topMarketCap ? formatCompactMoney(topMarketCap.marketCap, topMarketCap.currency ?? "TRY") : "-",
            note: topMarketCap ? `${topMarketCap.symbol} · ${topMarketCap.indexName ?? "BIST"}` : "Veri yok",
        },
    ];
}

export function getSummaryCards(tab: MarketTab, data: MarketData): SummaryCard[] {
    switch (tab) {
        case "fx":     return buildFxMarketCards(data.fx);
        case "bonds":  return buildBondMarketCards(data.bonds);
        case "funds":  return buildFundMarketCards(data.funds);
        case "stocks": return buildStockMarketCards(data.stocks);
        default:       return [];
    }
}

export function getLatestDatasetDate(tab: MarketTab, data: MarketData): string {
    switch (tab) {
        case "fx":     return formatLocalDate(latestStringValue(data.fx.map((r) => r.rateDate)));
        case "bonds":  return formatLocalDate(latestStringValue(data.bonds.map((r) => r.rateDate)));
        case "funds":  return formatLocalDate(latestStringValue(data.funds.map((r) => r.priceDate)));
        case "stocks": return formatLocalDate(latestStringValue(data.stocks.map((r) => r.tradeDate)));
        default:       return "-";
    }
}
