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

export const MARKET_TABS: Array<{ key: MarketTab }> = [
    { key: "fx" },
    { key: "bonds" },
    { key: "funds" },
    { key: "stocks" },
    { key: "indexes" },
    { key: "commodities" },
    { key: "crypto" },
    { key: "macro" },
    { key: "viop" },
];

export const TAB_I18N_KEY: Record<MarketTab, string> = {
    fx: "fx",
    bonds: "bond",
    funds: "fund",
    stocks: "stock",
    indexes: "index",
    commodities: "commodity",
    crypto: "crypto",
    macro: "macro",
    viop: "viop",
};

export const RANGE_I18N_KEY: Record<RangeKey, string> = {
    "1A": "oneMonth",
    "3A": "threeMonths",
    "6A": "sixMonths",
    "1Y": "oneYear",
};

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
