import type {
    DisplayCurrency,
    PortfolioInstrumentType,
    PortfolioResponse,
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

export type InstrumentOption = {
    id: number;
    type: PortfolioInstrumentType;
    symbol: string;
    name: string;
    price: number | null;
    currency: string;
    maturityText?: string | null;  // VIOP only
    maturityDate?: string | null;  // BOND only
};

export type PortfolioFormState = {
    mode: "create" | "edit";
    portfolio?: PortfolioResponse;
};

export type FxRateMap = Partial<Record<DisplayCurrency, number>>;

export const CHART_PALETTE = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export const TYPE_COLORS: Record<PortfolioInstrumentType, string> = {
    STOCK: "#3b82f6",
    FUND: "#8b5cf6",
    CURRENCY: "#f59e0b",
    BOND: "#10b981",
    VIOP: "#ef4444",
    DEPOSIT: "#64748b",
};

export const INSTRUMENT_LABELS: Record<PortfolioInstrumentType, string> = {
    STOCK: "Hisse",
    FUND: "Fon",
    CURRENCY: "Döviz",
    BOND: "Tahvil",
    VIOP: "VİOP",
    DEPOSIT: "Vadeli Mevduat",
};

export const CURRENCIES: DisplayCurrency[] = ["TRY", "USD", "EUR"];
