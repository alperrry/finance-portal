import type {
    DisplayCurrency,
    OrderType,
    PageResponse,
    PortfolioInstrumentType,
    PortfolioResponse,
    TradeResponse,
    TransactionStatus,
    TransactionType,
} from "../api/portfolioApi";

export type PortfolioLoadState = {
    loading: boolean;
    error: string | null;
};

export type DetailState = {
    loading: boolean;
    error: string | null;
    data: PortfolioResponse | null;
};

export type TradeHistoryState = {
    loading: boolean;
    error: string | null;
    page: PageResponse<TradeResponse> | null;
};

export type TradeFilters = {
    from: string;
    to: string;
    instrument: string;
    type: TransactionType | "";
    query: string;
};

export type InstrumentOption = {
    id: number;
    type: PortfolioInstrumentType;
    symbol: string;
    name: string;
    price: number | null;
    currency: string;
};

export type PortfolioFormState = {
    mode: "create" | "edit";
    portfolio?: PortfolioResponse;
};

export type FxRateMap = Partial<Record<DisplayCurrency, number>>;

export const TRADE_PAGE_SIZE = 8;
export const TRADE_EXPORT_PAGE_SIZE = 100;
export const CHART_PALETTE = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export const STATUS_LABELS: Record<TransactionStatus, string> = {
    PENDING: "Bekleyen",
    APPROVED: "Onaylanan",
    REJECTED: "Reddedilen",
    CANCELLED: "İptal edilen",
};

export const INSTRUMENT_LABELS: Record<PortfolioInstrumentType, string> = {
    STOCK: "Hisse",
    FUND: "Fon",
    CURRENCY: "Döviz",
    BOND: "Tahvil",
};

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
    BUY: "AL",
    SELL: "SAT",
};

export const ORDER_LABELS: Record<OrderType, string> = {
    MARKET: "Piyasa",
    LIMIT: "Limit",
};

export const CURRENCIES: DisplayCurrency[] = ["TRY", "USD", "EUR"];
