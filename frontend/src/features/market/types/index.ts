import type {
    BondResponse,
    FundResponse,
    FxResponse,
    MacroObservationResponse,
    StockResponse,
    ViopContractPriceResponse,
} from "../api/marketApi";
import type { InstrumentType } from "../../analysis/api/historyApi";

export type MarketTab = "fx" | "bonds" | "funds" | "stocks" | "indexes" | "commodities" | "crypto" | "macro" | "viop";

export type MarketData = {
    fx: FxResponse[];
    bonds: BondResponse[];
    funds: FundResponse[];
    stocks: StockResponse[];
    indexes: StockResponse[];
    commodities: StockResponse[];
    crypto: StockResponse[];
    macroInflation: MacroObservationResponse[];
    macroDepositRates: MacroObservationResponse[];
    viop: ViopContractPriceResponse[];
};

export type SummaryCard = {
    label: string;
    value: string;
    note: string;
    tone?: "up" | "down" | "neutral";
};

export type SortDirection = "asc" | "desc";

export type MarketSortKey =
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
    | "fetchedAt"
    | "series"
    | "dataType"
    | "value"
    | "monthlyChange"
    | "annualChange"
    | "contract"
    | "segment"
    | "underlying"
    | "maturity"
    | "changeAmount"
    | "volumeTry"
    | "quantity";

export type MarketSortState = Record<MarketTab, { key: MarketSortKey; direction: SortDirection }>;

export const MARKET_TABS: Array<{
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
        description: "BIST hisselerini günlük kapanış, performans ve hacim üzerinden okuyun.",
        searchPlaceholder: "Hisse kodu, ad veya sektör ara",
    },
    {
        key: "indexes",
        label: "Endeksler",
        description: "BIST 30 ve BIST 100 endekslerini günlük kapanış verileriyle izleyin.",
        searchPlaceholder: "Endeks kodu veya adı ara",
    },
    {
        key: "commodities",
        label: "Emtia",
        description: "Altın, petrol ve metaller gibi emtiaları hisse listesinden ayrı takip edin.",
        searchPlaceholder: "Emtia kodu veya adı ara",
    },
    {
        key: "crypto",
        label: "Kripto",
        description: "Kripto varlıkları ayrı piyasa grubu olarak izleyin.",
        searchPlaceholder: "Kripto kodu veya adı ara",
    },
    {
        key: "macro",
        label: "Makro",
        description: "TÜFE ve TL mevduat faizlerini EVDS serileriyle takip edin.",
        searchPlaceholder: "Seri adı, kodu veya veri tipi ara",
    },
    {
        key: "viop",
        label: "VİOP",
        description: "Vadeli kontratları segment, fiyat değişimi ve hacme göre tarayın.",
        searchPlaceholder: "Kontrat, segment veya dayanak ara",
    },
];

export const PRIORITY_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "SAR", "KWD", "JPY"];

export const DEFAULT_SORT_STATE: MarketSortState = {
    fx: { key: "pair", direction: "asc" },
    bonds: { key: "maturity", direction: "asc" },
    funds: { key: "portfolioSize", direction: "desc" },
    stocks: { key: "change", direction: "desc" },
    indexes: { key: "change", direction: "desc" },
    commodities: { key: "change", direction: "desc" },
    crypto: { key: "change", direction: "desc" },
    macro: { key: "date", direction: "desc" },
    viop: { key: "volumeTry", direction: "desc" },
};

// InstrumentDetailPage types
export type RangeKey = "1A" | "3A" | "6A" | "1Y";

export type RequestState<T> = {
    resolvedKey: string;
    data: T | null;
    error: string | null;
};

export type ChartSeries = {
    key: string;
    label: string;
    color: string;
    values: Array<number | null>;
};

export type InstrumentSummary = {
    type: InstrumentType;
    code: string;
    title: string;
    subtitle: string;
    helper: string;
    currency: string | null;
    latestValue: number | null;
    latestDate: string | null;
    snapshotChange: number | null;
    newsQuery: string;
    stats: Array<{ label: string; value: string }>;
};

export type InstrumentMetricCard = {
    label: string;
    value: string;
    note: string;
};

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; months?: number; days?: number }> = [
    { key: "1A", label: "1A", months: 1 },
    { key: "3A", label: "3A", months: 3 },
    { key: "6A", label: "6A", months: 6 },
    { key: "1Y", label: "1Y", days: 365 },
];

export const DEFAULT_RANGE: RangeKey = "6A";

export const CHART_COLORS = {
    price: "#111111",
    accent: "#c1622f",
    success: "#5bb870",
    danger: "#e05858",
};
