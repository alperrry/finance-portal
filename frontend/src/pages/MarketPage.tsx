import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchBonds,
    fetchFunds,
    fetchFx,
    fetchStocks,
    type BondResponse,
    type FundResponse,
    type FxResponse,
    type StockResponse,
} from "../api/market";
import { KapitalShell } from "../components/layout";
import "./MarketPage.css";

type MarketTab = "fx" | "bonds" | "funds" | "stocks";

type MarketData = {
    fx: FxResponse[];
    bonds: BondResponse[];
    funds: FundResponse[];
    stocks: StockResponse[];
};

type SummaryCard = {
    label: string;
    value: string;
    note: string;
    tone?: "up" | "down" | "neutral";
};

type SortDirection = "asc" | "desc";

type MarketSortKey =
    | "pair"
    | "name"
    | "buying"
    | "selling"
    | "spread"
    | "date"
    | "instrument"
    | "type"
    | "maturity"
    | "interest"
    | "compounded"
    | "currency"
    | "fund"
    | "price"
    | "investors"
    | "portfolioSize"
    | "shares"
    | "stock"
    | "sector"
    | "change"
    | "volume"
    | "marketCap"
    | "range52w"
    | "fetchedAt";

type MarketSortState = Record<MarketTab, { key: MarketSortKey; direction: SortDirection }>;

const MARKET_TABS: Array<{
    key: MarketTab;
    label: string;
    description: string;
    searchPlaceholder: string;
}> = [
    {
        key: "fx",
        label: "Döviz",
        description: "TCMB kurlarıyla ana pariteleri tek panelde izleyin.",
        searchPlaceholder: "Kod veya para birimi ara",
    },
    {
        key: "bonds",
        label: "Tahvil/Bono",
        description: "Faiz, bileşik ve vade kırılımını tek tabloda görün.",
        searchPlaceholder: "Tahvil adı veya para birimi ara",
    },
    {
        key: "funds",
        label: "Fonlar",
        description: "TEFAS fonlarını fiyat, yatırımcı ve büyüklük bazında tarayın.",
        searchPlaceholder: "Fon kodu veya adı ara",
    },
    {
        key: "stocks",
        label: "Hisseler",
        description: "BIST hisselerini fiyat, performans ve hacim üzerinden okuyun.",
        searchPlaceholder: "Hisse kodu, ad veya sektör ara",
    },
];

const PRIORITY_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "SAR", "KWD", "JPY"];

const DEFAULT_SORT_STATE: MarketSortState = {
    fx: { key: "pair", direction: "asc" },
    bonds: { key: "maturity", direction: "asc" },
    funds: { key: "portfolioSize", direction: "desc" },
    stocks: { key: "change", direction: "desc" },
};

const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });

const normalizeSearch = (value: string) =>
    value
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c");

const toSafeNumber = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const compareNullableNumbersAsc = (left: number | null | undefined, right: number | null | undefined) => {
    const normalizedLeft = toSafeNumber(left);
    const normalizedRight = toSafeNumber(right);

    if (normalizedLeft === null && normalizedRight === null) return 0;
    if (normalizedLeft === null) return 1;
    if (normalizedRight === null) return -1;

    return normalizedLeft - normalizedRight;
};

const compareNullableNumbersDesc = (left: number | null | undefined, right: number | null | undefined) =>
    compareNullableNumbersAsc(right, left);

const compareNullableStringsAsc = (left: string | null | undefined, right: string | null | undefined) => {
    const normalizedLeft = left?.trim() ?? "";
    const normalizedRight = right?.trim() ?? "";

    if (!normalizedLeft && !normalizedRight) return 0;
    if (!normalizedLeft) return 1;
    if (!normalizedRight) return -1;

    return collator.compare(normalizedLeft, normalizedRight);
};

const toTimestamp = (value: string | null | undefined) => {
    if (!value) return null;

    const normalized = Date.parse(value);
    return Number.isNaN(normalized) ? null : normalized;
};

const compareNullableDatesAsc = (left: string | null | undefined, right: string | null | undefined) =>
    compareNullableNumbersAsc(toTimestamp(left), toTimestamp(right));

const applySortDirection = (result: number, direction: SortDirection) => (direction === "asc" ? result : -result);

const formatNumber = (value: number | null | undefined, digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
};

const formatWholeNumber = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: 0,
    }).format(normalized);
};

const formatCompactNumber = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const absolute = Math.abs(normalized);

    if (absolute >= 1_000_000_000) {
        return `${formatNumber(normalized / 1_000_000_000, 1)} Mr`;
    }

    if (absolute >= 1_000_000) {
        return `${formatNumber(normalized / 1_000_000, 1)} Mn`;
    }

    if (absolute >= 1_000) {
        return `${formatNumber(normalized / 1_000, 1)} Bin`;
    }

    return formatWholeNumber(normalized);
};

const formatRate = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const digits = Math.abs(normalized) >= 10 ? 4 : 5;
    return formatNumber(normalized, digits);
};

const formatSignedNumber = (value: number | null | undefined, digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, digits)}`;
};

const formatPercent = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, 2)}%`;
};

const formatMoney = (value: number | null | undefined, currency = "TRY", digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const formatted = formatNumber(normalized, digits);
    if (currency === "TRY") return `₺${formatted}`;
    if (currency === "USD") return `$${formatted}`;
    if (currency === "EUR") return `€${formatted}`;
    return `${formatted} ${currency}`;
};

const formatCompactMoney = (value: number | null | undefined, currency = "TRY") => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const formatted = formatCompactNumber(normalized);
    if (currency === "TRY") return `₺${formatted}`;
    if (currency === "USD") return `$${formatted}`;
    if (currency === "EUR") return `€${formatted}`;
    return `${formatted} ${currency}`;
};

const formatLocalDate = (value: string | null | undefined) => {
    if (!value) return "-";

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return "-";

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(year, month - 1, day));
};

const formatLocalDateTime = (value: string | Date | null | undefined) => {
    if (!value) return "-";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const formatUnitLabel = (unit: number | null | undefined, currencyCode: string) => {
    const normalized = toSafeNumber(unit);
    if (normalized === null || normalized <= 1) return currencyCode;
    return `${formatWholeNumber(normalized)} ${currencyCode}`;
};

const getFxSpread = (item: FxResponse) => {
    const buying = toSafeNumber(item.forexBuying);
    const selling = toSafeNumber(item.forexSelling);

    if (buying === null || selling === null) return null;
    return selling - buying;
};

const latestStringValue = (values: Array<string | null | undefined>) =>
    values.filter((value): value is string => Boolean(value)).sort(collator.compare).at(-1) ?? null;

const compareFxPairAsc = (left: FxResponse, right: FxResponse) => {
    const leftIndex = PRIORITY_CURRENCIES.indexOf(left.currencyCode);
    const rightIndex = PRIORITY_CURRENCIES.indexOf(right.currencyCode);

    if (leftIndex >= 0 || rightIndex >= 0) {
        if (leftIndex < 0) return 1;
        if (rightIndex < 0) return -1;
        return leftIndex - rightIndex;
    }

    return collator.compare(left.currencyCode, right.currencyCode);
};

function sortFxRows(rows: FxResponse[], sortConfig: MarketSortState["fx"]) {
    return [...rows].sort((left, right) => {
        let result = 0;

        switch (sortConfig.key) {
            case "pair":
                result = compareFxPairAsc(left, right);
                break;
            case "name":
                result = compareNullableStringsAsc(left.currencyName, right.currencyName);
                break;
            case "buying":
                result = compareNullableNumbersAsc(left.forexBuying, right.forexBuying);
                break;
            case "selling":
                result = compareNullableNumbersAsc(left.forexSelling, right.forexSelling);
                break;
            case "spread":
                result = compareNullableNumbersAsc(getFxSpread(left), getFxSpread(right));
                break;
            case "date":
                result = compareNullableDatesAsc(left.rateDate, right.rateDate);
                break;
            default:
                result = compareFxPairAsc(left, right);
        }

        if (result === 0) {
            result = compareFxPairAsc(left, right);
        }

        return applySortDirection(result, sortConfig.direction);
    });
}

function sortBondRows(rows: BondResponse[], sortConfig: MarketSortState["bonds"]) {
    return [...rows].sort((left, right) => {
        let result = 0;

        switch (sortConfig.key) {
            case "instrument":
                result = compareNullableStringsAsc(left.name, right.name);
                break;
            case "type":
                result = compareNullableStringsAsc(left.bondType, right.bondType);
                break;
            case "maturity":
                result = compareNullableNumbersAsc(left.maturityDays, right.maturityDays);
                break;
            case "interest":
                result = compareNullableNumbersAsc(left.interestRate, right.interestRate);
                break;
            case "compounded":
                result = compareNullableNumbersAsc(left.compoundedRate, right.compoundedRate);
                break;
            case "currency":
                result = compareNullableStringsAsc(left.currency, right.currency);
                break;
            case "date":
                result = compareNullableDatesAsc(left.rateDate, right.rateDate);
                break;
            default:
                result = compareNullableStringsAsc(left.name, right.name);
        }

        if (result === 0) {
            result = compareNullableStringsAsc(left.name, right.name);
        }

        return applySortDirection(result, sortConfig.direction);
    });
}

function sortFundRows(rows: FundResponse[], sortConfig: MarketSortState["funds"]) {
    return [...rows].sort((left, right) => {
        let result = 0;

        switch (sortConfig.key) {
            case "fund":
                result = compareNullableStringsAsc(left.code, right.code);
                break;
            case "type":
                result = compareNullableStringsAsc(left.fundType, right.fundType);
                break;
            case "price":
                result = compareNullableNumbersAsc(left.price, right.price);
                break;
            case "investors":
                result = compareNullableNumbersAsc(left.investorCount, right.investorCount);
                break;
            case "portfolioSize":
                result = compareNullableNumbersAsc(left.portfolioSize, right.portfolioSize);
                break;
            case "shares":
                result = compareNullableNumbersAsc(left.totalShares, right.totalShares);
                break;
            case "date":
                result = compareNullableDatesAsc(left.priceDate, right.priceDate);
                break;
            default:
                result = compareNullableStringsAsc(left.code, right.code);
        }

        if (result === 0) {
            result = compareNullableStringsAsc(left.code, right.code);
        }

        return applySortDirection(result, sortConfig.direction);
    });
}

function getStockRangeWidth(row: StockResponse) {
    const high = toSafeNumber(row.fiftyTwoWeekHigh);
    const low = toSafeNumber(row.fiftyTwoWeekLow);

    if (high === null || low === null) return null;
    return high - low;
}

function sortStockRows(rows: StockResponse[], sortConfig: MarketSortState["stocks"]) {
    return [...rows].sort((left, right) => {
        let result = 0;

        switch (sortConfig.key) {
            case "stock":
                result = compareNullableStringsAsc(left.symbol, right.symbol);
                break;
            case "sector":
                result = compareNullableStringsAsc(left.sector ?? left.indexName, right.sector ?? right.indexName);
                break;
            case "price":
                result = compareNullableNumbersAsc(left.price, right.price);
                break;
            case "change":
                result = compareNullableNumbersAsc(left.changePercent, right.changePercent);
                if (result === 0) {
                    result = compareNullableNumbersAsc(left.change, right.change);
                }
                break;
            case "volume":
                result = compareNullableNumbersAsc(left.volume, right.volume);
                break;
            case "marketCap":
                result = compareNullableNumbersAsc(left.marketCap, right.marketCap);
                break;
            case "range52w":
                result = compareNullableNumbersAsc(getStockRangeWidth(left), getStockRangeWidth(right));
                break;
            case "fetchedAt":
                result = compareNullableDatesAsc(left.fetchedAt, right.fetchedAt);
                if (result === 0) {
                    result = compareNullableDatesAsc(left.tradeDate, right.tradeDate);
                }
                break;
            default:
                result = compareNullableStringsAsc(left.symbol, right.symbol);
        }

        if (result === 0) {
            result = compareNullableStringsAsc(left.symbol, right.symbol);
        }

        return applySortDirection(result, sortConfig.direction);
    });
}

function buildFxSummary(rows: FxResponse[]): SummaryCard[] {
    const usd = rows.find((row) => row.currencyCode === "USD");
    const eur = rows.find((row) => row.currencyCode === "EUR");
    const narrowestSpread = [...rows]
        .filter((row) => getFxSpread(row) !== null)
        .sort((left, right) => compareNullableNumbersAsc(getFxSpread(left), getFxSpread(right)))[0];

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
            value: narrowestSpread ? formatRate(getFxSpread(narrowestSpread)) : "-",
            note: narrowestSpread
                ? `${formatUnitLabel(narrowestSpread.unit, narrowestSpread.currencyCode)} · ${narrowestSpread.currencyName}`
                : "Veri yok",
        },
    ];
}

function buildBondSummary(rows: BondResponse[]): SummaryCard[] {
    const highestInterest = [...rows].sort((left, right) => compareNullableNumbersDesc(left.interestRate, right.interestRate))[0];
    const highestCompounded = [...rows].sort((left, right) => compareNullableNumbersDesc(left.compoundedRate, right.compoundedRate))[0];
    const shortestMaturity = [...rows].sort((left, right) => compareNullableNumbersAsc(left.maturityDays, right.maturityDays))[0];

    return [
        {
            label: "En yuksek faiz",
            value: highestInterest?.interestRate !== null && highestInterest?.interestRate !== undefined
                ? `%${formatNumber(highestInterest.interestRate, 2)}`
                : "-",
            note: highestInterest ? highestInterest.name : "Veri yok",
        },
        {
            label: "En yuksek bileşik",
            value: highestCompounded?.compoundedRate !== null && highestCompounded?.compoundedRate !== undefined
                ? `%${formatNumber(highestCompounded.compoundedRate, 2)}`
                : "-",
            note: highestCompounded ? highestCompounded.name : "Veri yok",
        },
        {
            label: "En kisa vade",
            value: shortestMaturity?.maturityDays !== null && shortestMaturity?.maturityDays !== undefined
                ? `${formatWholeNumber(shortestMaturity.maturityDays)} gun`
                : "-",
            note: shortestMaturity ? shortestMaturity.name : "Veri yok",
        },
    ];
}

function buildFundSummary(rows: FundResponse[]): SummaryCard[] {
    const bySize = [...rows].sort((left, right) => compareNullableNumbersDesc(left.portfolioSize, right.portfolioSize))[0];
    const byInvestors = [...rows].sort((left, right) => compareNullableNumbersDesc(left.investorCount, right.investorCount))[0];
    const averagePrice =
        rows.length > 0
            ? rows.reduce((sum, row) => sum + (toSafeNumber(row.price) ?? 0), 0) / rows.length
            : null;

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

function buildStockSummary(rows: StockResponse[]): SummaryCard[] {
    if (rows.length === 0) {
        return [
            {
                label: "Hisse verisi",
                value: "Veri yok",
                note: "Seans disi veya hafta sonu olabilir.",
            },
            {
                label: "Guncelleme",
                value: "-",
                note: "Yeni fiyat gelince otomatik olarak page refresh ile alinabilir.",
            },
            {
                label: "Durum",
                value: "Bekleniyor",
                note: "Bos liste backend contract'ina uygun bir durumdur.",
            },
        ];
    }

    const topGainer = [...rows].sort((left, right) => compareNullableNumbersDesc(left.changePercent, right.changePercent))[0];
    const topVolume = [...rows].sort((left, right) => compareNullableNumbersDesc(left.volume, right.volume))[0];
    const topMarketCap = [...rows].sort((left, right) => compareNullableNumbersDesc(left.marketCap, right.marketCap))[0];

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

function getSummaryCards(tab: MarketTab, data: MarketData): SummaryCard[] {
    switch (tab) {
        case "fx":
            return buildFxSummary(data.fx);
        case "bonds":
            return buildBondSummary(data.bonds);
        case "funds":
            return buildFundSummary(data.funds);
        case "stocks":
            return buildStockSummary(data.stocks);
        default:
            return [];
    }
}

function getLatestDatasetDate(tab: MarketTab, data: MarketData) {
    switch (tab) {
        case "fx":
            return formatLocalDate(latestStringValue(data.fx.map((item) => item.rateDate)));
        case "bonds":
            return formatLocalDate(latestStringValue(data.bonds.map((item) => item.rateDate)));
        case "funds":
            return formatLocalDate(latestStringValue(data.funds.map((item) => item.priceDate)));
        case "stocks":
            return formatLocalDate(latestStringValue(data.stocks.map((item) => item.tradeDate)));
        default:
            return "-";
    }
}

const matchesSearch = (query: string, ...fields: Array<string | null | undefined>) => {
    if (!query) return true;

    const normalizedQuery = normalizeSearch(query);
    return fields.some((field) => normalizeSearch(field ?? "").includes(normalizedQuery));
};

function dedupeStocksByLatestSnapshot(rows: StockResponse[]) {
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

export default function MarketPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<MarketTab>("fx");
    const [query, setQuery] = useState("");
    const [sortState, setSortState] = useState<MarketSortState>(DEFAULT_SORT_STATE);
    const [reloadToken, setReloadToken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<MarketData | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

    useEffect(() => {
        let active = true;

        const loadMarketData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [fx, bonds, funds, stocks] = await Promise.all([fetchFx(), fetchBonds(), fetchFunds(), fetchStocks()]);
                if (!active) return;

                setData({ fx, bonds, funds, stocks });
                setLastSyncedAt(new Date());
            } catch (caughtError: unknown) {
                if (!active) return;

                if (caughtError instanceof TypeError) {
                    setError("Backend'e erisilemedi. VITE_API_BASE_URL ve backend CorsConfig ayarlarini kontrol edin.");
                    return;
                }

                if (caughtError instanceof Error) {
                    setError(caughtError.message);
                    return;
                }

                setError("Piyasa verileri yuklenemedi.");
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadMarketData();

        return () => {
            active = false;
        };
    }, [reloadToken]);

    const activeMeta = MARKET_TABS.find((tab) => tab.key === activeTab) ?? MARKET_TABS[0];

    const fxRows = useMemo(() => {
        if (!data) return [];

        return sortFxRows(
            data.fx.filter((row) => matchesSearch(query, row.currencyCode, row.currencyName)),
            sortState.fx,
        );
    }, [data, query, sortState.fx]);

    const bondRows = useMemo(() => {
        if (!data) return [];

        return sortBondRows(
            data.bonds.filter((row) => matchesSearch(query, row.name, row.currency, row.bondType, row.evdsSeriesCode)),
            sortState.bonds,
        );
    }, [data, query, sortState.bonds]);

    const fundRows = useMemo(() => {
        if (!data) return [];

        return sortFundRows(
            data.funds.filter((row) => matchesSearch(query, row.code, row.name, row.fundType)),
            sortState.funds,
        );
    }, [data, query, sortState.funds]);

    const stockRows = useMemo(() => {
        if (!data) return [];

        return sortStockRows(
            dedupeStocksByLatestSnapshot(data.stocks)
                .filter((row) => matchesSearch(query, row.symbol, row.shortName, row.longName, row.sector, row.indexName)),
            sortState.stocks,
        );
    }, [data, query, sortState.stocks]);

    const dedupedStocks = useMemo(() => (data ? dedupeStocksByLatestSnapshot(data.stocks) : []), [data]);

    const summaryCards = useMemo(() => {
        if (!data) return [];

        return getSummaryCards(activeTab, {
            ...data,
            stocks: dedupedStocks,
        });
    }, [activeTab, data, dedupedStocks]);
    const activeDatasetDate = useMemo(() => (data ? getLatestDatasetDate(activeTab, data) : "-"), [activeTab, data]);

    const getTabCount = (tab: MarketTab) => {
        if (!data) return null;
        if (tab === "stocks") return dedupedStocks.length;
        return data[tab].length;
    };

    const visibleCount =
        activeTab === "fx"
            ? fxRows.length
            : activeTab === "bonds"
              ? bondRows.length
              : activeTab === "funds"
                ? fundRows.length
                : stockRows.length;

    const totalCount = getTabCount(activeTab) ?? 0;
    const isInitialLoading = loading && data === null;
    const isRefreshing = loading && data !== null;
    const stockDatasetIsEmpty = Boolean(data && dedupedStocks.length === 0);

    const toggleSort = (tab: MarketTab, key: MarketSortKey) => {
        setSortState((current) => {
            const currentSort = current[tab];

            return {
                ...current,
                [tab]: {
                    key,
                    direction: currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc",
                },
            };
        });
    };

    const renderSortableHeader = (tab: MarketTab, key: MarketSortKey, label: string) => {
        const currentSort = sortState[tab];
        const isActive = currentSort.key === key;

        return (
            <button
                className={`market-sort-button ${isActive ? "active" : ""}`.trim()}
                type="button"
                onClick={() => toggleSort(tab, key)}
            >
                <span>{label}</span>
                <span className="market-sort-indicator" aria-hidden="true">
                    {isActive ? (currentSort.direction === "asc" ? "↑" : "↓") : ""}
                </span>
            </button>
        );
    };

    const openInstrumentDetail = (type: MarketTab, code: string) => {
        navigate(`/portfolio/${type}/${encodeURIComponent(code)}`);
    };

    const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, type: MarketTab, code: string) => {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();
        openInstrumentDetail(type, code);
    };

    return (
        <KapitalShell activePage="portfolio" showCategories={false}>
            <div className="market-page">
                <div className="market-layout">
                    <section className="market-hero">
                        <div className="market-hero-copy">
                            <div className="market-kicker">Canlı Piyasa Terminali</div>
                            <h1 className="market-title">Enstrümanlar</h1>

                            <div className="market-tab-list" role="tablist" aria-label="Enstrüman kategorileri">
                                {MARKET_TABS.map((tab) => {
                                    const isActive = activeTab === tab.key;

                                    return (
                                        <button
                                            key={tab.key}
                                            className={`market-tab-pill ${isActive ? "active" : ""}`.trim()}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            onClick={() => {
                                                setActiveTab(tab.key);
                                                setQuery("");
                                            }}
                                        >
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="market-hero-actions">
                                <div className="market-sync-note">
                                    Son senkron: <strong>{lastSyncedAt ? formatLocalDateTime(lastSyncedAt) : "Bekleniyor"}</strong>
                                </div>
                                <button
                                    className="market-refresh-btn"
                                    type="button"
                                    disabled={loading}
                                    onClick={() => setReloadToken((value) => value + 1)}
                                >
                                    {isRefreshing || isInitialLoading ? "Yenileniyor..." : "Verileri Yenile"}
                                </button>
                            </div>
                        </div>
                    </section>

                    {error ? (
                        <div className="market-status-card error">
                            <div>
                                <strong>Veri akisi kesildi.</strong>
                                <span>{error}</span>
                            </div>
                            <button className="market-inline-btn" type="button" onClick={() => setReloadToken((value) => value + 1)}>
                                Tekrar dene
                            </button>
                        </div>
                    ) : null}

                    {isInitialLoading ? (
                        <>
                            <section className="market-summary-grid">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <article key={`summary-skeleton-${index}`} className="market-summary-card skeleton">
                                        <div className="market-skeleton-line short" />
                                        <div className="market-skeleton-line large" />
                                        <div className="market-skeleton-line medium" />
                                    </article>
                                ))}
                            </section>

                            <section className="market-panel">
                                <div className="market-panel-head">
                                    <div>
                                        <div className="market-panel-kicker">Yukleniyor</div>
                                        <h2 className="market-panel-title">Piyasa verileri hazirlaniyor</h2>
                                    </div>
                                </div>
                                <div className="market-table-skeleton">
                                    {Array.from({ length: 7 }).map((_, index) => (
                                        <div key={`row-skeleton-${index}`} className="market-table-skeleton-row" />
                                    ))}
                                </div>
                            </section>
                        </>
                    ) : null}

                    {data ? (
                        <>
                            <section className="market-summary-grid">
                                {summaryCards.map((card) => (
                                    <article key={card.label} className="market-summary-card">
                                        <div className="market-summary-label">{card.label}</div>
                                        <div className={`market-summary-value ${card.tone ?? "neutral"}`.trim()}>{card.value}</div>
                                        <div className="market-summary-note">{card.note}</div>
                                    </article>
                                ))}
                            </section>

                            <section className="market-panel">
                                <div className="market-panel-head">
                                    <div>
                                        <h2 className="market-panel-title">{activeMeta.label}</h2>
                                        <p className="market-panel-subtitle">{activeMeta.description}</p>
                                    </div>

                                    <div className="market-panel-tools">
                                        <label className="market-search-field" htmlFor="market-search">
                                            <span className="market-search-icon" aria-hidden="true">⌕</span>
                                            <input
                                                id="market-search"
                                                type="search"
                                                value={query}
                                                placeholder={activeMeta.searchPlaceholder}
                                                onChange={(event) => setQuery(event.target.value)}
                                            />
                                        </label>

                                        <div className="market-chip-group">
                                            <span className="market-chip">{formatWholeNumber(visibleCount)} / {formatWholeNumber(totalCount)} kayıt</span>
                                            <span className="market-chip">Veri tarihi {activeDatasetDate}</span>
                                        </div>
                                    </div>
                                </div>

                                {activeTab === "stocks" && stockDatasetIsEmpty ? (
                                    <div className="market-empty-card">
                                        <strong>Hisse listesi su an bos.</strong>
                                        <span>
                                            Bu beklenen bir durum. Backend contract'ina göre `stocks` hafta sonu veya gece boş
                                            liste dönebilir.
                                        </span>
                                    </div>
                                ) : null}

                                {activeTab === "fx" && fxRows.length === 0 ? (
                                    <div className="market-empty-card">
                                        <strong>Aramaya uyan doviz kaydi yok.</strong>
                                        <span>Filtreyi temizleyip tekrar deneyin.</span>
                                    </div>
                                ) : null}

                                {activeTab === "bonds" && bondRows.length === 0 ? (
                                    <div className="market-empty-card">
                                        <strong>Aramaya uyan tahvil kaydi yok.</strong>
                                        <span>Filtreyi temizleyip tekrar deneyin.</span>
                                    </div>
                                ) : null}

                                {activeTab === "funds" && fundRows.length === 0 ? (
                                    <div className="market-empty-card">
                                        <strong>Aramaya uyan fon kaydi yok.</strong>
                                        <span>Filtreyi temizleyip tekrar deneyin.</span>
                                    </div>
                                ) : null}

                                {activeTab === "stocks" && !stockDatasetIsEmpty && stockRows.length === 0 ? (
                                    <div className="market-empty-card">
                                        <strong>Aramaya uyan hisse kaydi yok.</strong>
                                        <span>Filtreyi temizleyip tekrar deneyin.</span>
                                    </div>
                                ) : null}

                                {activeTab === "fx" && fxRows.length > 0 ? (
                                    <div className="market-table-wrap">
                                        <table className="market-table">
                                            <thead>
                                                <tr>
                                                    <th>{renderSortableHeader("fx", "pair", "Parite")}</th>
                                                    <th>{renderSortableHeader("fx", "name", "Ad")}</th>
                                                    <th>{renderSortableHeader("fx", "buying", "Alış")}</th>
                                                    <th>{renderSortableHeader("fx", "selling", "Satış")}</th>
                                                    <th>{renderSortableHeader("fx", "spread", "Makas")}</th>
                                                    <th>{renderSortableHeader("fx", "date", "Tarih")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fxRows.map((row) => (
                                                    <tr
                                                        key={row.currencyCode}
                                                        className="market-clickable-row"
                                                        tabIndex={0}
                                                        role="button"
                                                        onClick={() => openInstrumentDetail("fx", row.currencyCode)}
                                                        onKeyDown={(event) => handleRowKeyDown(event, "fx", row.currencyCode)}
                                                    >
                                                        <td>
                                                            <div className="market-primary-cell">
                                                                <strong>{formatUnitLabel(row.unit, row.currencyCode)}</strong>
                                                                <span>TRY</span>
                                                            </div>
                                                        </td>
                                                        <td>{row.currencyName}</td>
                                                        <td>{formatRate(row.forexBuying)}</td>
                                                        <td>{formatRate(row.forexSelling)}</td>
                                                        <td>{formatRate(getFxSpread(row))}</td>
                                                        <td>{formatLocalDate(row.rateDate)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}

                                {activeTab === "bonds" && bondRows.length > 0 ? (
                                    <div className="market-table-wrap">
                                        <table className="market-table">
                                            <thead>
                                                <tr>
                                                    <th>{renderSortableHeader("bonds", "instrument", "Enstrüman")}</th>
                                                    <th>{renderSortableHeader("bonds", "type", "Tip")}</th>
                                                    <th>{renderSortableHeader("bonds", "maturity", "Vade")}</th>
                                                    <th>{renderSortableHeader("bonds", "interest", "Faiz")}</th>
                                                    <th>{renderSortableHeader("bonds", "compounded", "Bileşik")}</th>
                                                    <th>{renderSortableHeader("bonds", "currency", "Para Birimi")}</th>
                                                    <th>{renderSortableHeader("bonds", "date", "Tarih")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bondRows.map((row) => (
                                                    <tr
                                                        key={row.evdsSeriesCode}
                                                        className="market-clickable-row"
                                                        tabIndex={0}
                                                        role="button"
                                                        onClick={() => openInstrumentDetail("bonds", row.evdsSeriesCode)}
                                                        onKeyDown={(event) => handleRowKeyDown(event, "bonds", row.evdsSeriesCode)}
                                                    >
                                                        <td>
                                                            <div className="market-primary-cell">
                                                                <strong>{row.name}</strong>
                                                                <span>{row.evdsSeriesCode}</span>
                                                            </div>
                                                        </td>
                                                        <td>{row.bondType ?? "-"}</td>
                                                        <td>{row.maturityDays !== null && row.maturityDays !== undefined ? `${formatWholeNumber(row.maturityDays)} gun` : "-"}</td>
                                                        <td>{row.interestRate !== null && row.interestRate !== undefined ? `%${formatNumber(row.interestRate, 2)}` : "-"}</td>
                                                        <td>{row.compoundedRate !== null && row.compoundedRate !== undefined ? `%${formatNumber(row.compoundedRate, 2)}` : "-"}</td>
                                                        <td>{row.currency ?? "-"}</td>
                                                        <td>{formatLocalDate(row.rateDate)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}

                                {activeTab === "funds" && fundRows.length > 0 ? (
                                    <div className="market-table-wrap">
                                        <table className="market-table">
                                            <thead>
                                                <tr>
                                                    <th>{renderSortableHeader("funds", "fund", "Fon")}</th>
                                                    <th>{renderSortableHeader("funds", "type", "Tür")}</th>
                                                    <th>{renderSortableHeader("funds", "price", "Fiyat")}</th>
                                                    <th>{renderSortableHeader("funds", "investors", "Yatırımcı")}</th>
                                                    <th>{renderSortableHeader("funds", "portfolioSize", "Portföy Büyüklüğü")}</th>
                                                    <th>{renderSortableHeader("funds", "shares", "Pay Adedi")}</th>
                                                    <th>{renderSortableHeader("funds", "date", "Tarih")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fundRows.map((row) => (
                                                    <tr
                                                        key={row.code}
                                                        className="market-clickable-row"
                                                        tabIndex={0}
                                                        role="button"
                                                        onClick={() => openInstrumentDetail("funds", row.code)}
                                                        onKeyDown={(event) => handleRowKeyDown(event, "funds", row.code)}
                                                    >
                                                        <td>
                                                            <div className="market-primary-cell">
                                                                <strong>{row.code}</strong>
                                                                <span>{row.name}</span>
                                                            </div>
                                                        </td>
                                                        <td>{row.fundType ?? "-"}</td>
                                                        <td>{formatMoney(row.price, "TRY", 4)}</td>
                                                        <td>{formatCompactNumber(row.investorCount)}</td>
                                                        <td>{formatCompactMoney(row.portfolioSize, "TRY")}</td>
                                                        <td>{formatCompactNumber(row.totalShares)}</td>
                                                        <td>{formatLocalDate(row.priceDate)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}

                                {activeTab === "stocks" && stockRows.length > 0 ? (
                                    <div className="market-table-wrap">
                                        <table className="market-table">
                                            <thead>
                                                <tr>
                                                    <th>{renderSortableHeader("stocks", "stock", "Hisse")}</th>
                                                    <th>{renderSortableHeader("stocks", "sector", "Sektör")}</th>
                                                    <th>{renderSortableHeader("stocks", "price", "Fiyat")}</th>
                                                    <th>{renderSortableHeader("stocks", "change", "Değişim")}</th>
                                                    <th>{renderSortableHeader("stocks", "volume", "Hacim")}</th>
                                                    <th>{renderSortableHeader("stocks", "marketCap", "Piyasa Değeri")}</th>
                                                    <th>{renderSortableHeader("stocks", "range52w", "52H Aralık")}</th>
                                                    <th>{renderSortableHeader("stocks", "fetchedAt", "Son Çekim")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockRows.map((row) => (
                                                    <tr
                                                        key={row.symbol}
                                                        className="market-clickable-row"
                                                        tabIndex={0}
                                                        role="button"
                                                        onClick={() => openInstrumentDetail("stocks", row.symbol)}
                                                        onKeyDown={(event) => handleRowKeyDown(event, "stocks", row.symbol)}
                                                    >
                                                        <td>
                                                            <div className="market-primary-cell">
                                                                <strong>{row.symbol}</strong>
                                                                <span>{row.shortName ?? row.longName ?? "Hisse"}</span>
                                                            </div>
                                                        </td>
                                                        <td>{row.sector ?? row.indexName ?? "-"}</td>
                                                        <td>{formatMoney(row.price, row.currency ?? "TRY")}</td>
                                                        <td>
                                                            <div className={`market-change ${toSafeNumber(row.changePercent) !== null && (row.changePercent ?? 0) < 0 ? "down" : "up"}`.trim()}>
                                                                <strong>{formatPercent(row.changePercent)}</strong>
                                                                <span>{formatSignedNumber(row.change, 2)}</span>
                                                            </div>
                                                        </td>
                                                        <td>{formatCompactNumber(row.volume)}</td>
                                                        <td>{formatCompactMoney(row.marketCap, row.currency ?? "TRY")}</td>
                                                        <td>
                                                            {row.fiftyTwoWeekLow !== null && row.fiftyTwoWeekLow !== undefined && row.fiftyTwoWeekHigh !== null && row.fiftyTwoWeekHigh !== undefined
                                                                ? `${formatMoney(row.fiftyTwoWeekLow, row.currency ?? "TRY")} / ${formatMoney(row.fiftyTwoWeekHigh, row.currency ?? "TRY")}`
                                                                : "-"}
                                                        </td>
                                                        <td>
                                                            <div className="market-primary-cell">
                                                                <strong>{formatLocalDate(row.tradeDate)}</strong>
                                                                <span>{formatLocalDateTime(row.fetchedAt)}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </section>
                        </>
                    ) : null}
                </div>
            </div>
        </KapitalShell>
    );
}
