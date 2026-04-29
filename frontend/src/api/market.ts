import { API_BASE, apiFetch, type ApiAuthMode } from "./client";

export type ApiResponse<T> = {
    success: boolean;
    data: T;
};

export type FxResponse = {
    currencyCode: string;
    currencyName: string;
    unit: number;
    forexBuying: number | null;
    forexSelling: number | null;
    rateDate: string | null;
};

export type BondResponse = {
    evdsSeriesCode: string;
    name: string;
    bondType: string;
    maturityDays: number | null;
    currency: string | null;
    interestRate: number | null;
    compoundedRate: number | null;
    rateDate: string | null;
};

export type FundResponse = {
    code: string;
    name: string;
    fundType: string | null;
    price: number | null;
    totalShares: number | null;
    investorCount: number | null;
    portfolioSize: number | null;
    priceDate: string | null;
};

export type StockResponse = {
    symbol: string;
    shortName: string | null;
    longName: string | null;
    sector: string | null;
    indexName: string | null;
    currency: string | null;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    open: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    previousClose: number | null;
    volume: number | null;
    marketCap: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    tradeDate: string | null;
    fetchedAt: string | null;
};

export { API_BASE };

type ApiRequestOptions = {
    auth?: ApiAuthMode;
};

async function fetchCollection<T>(path: string, errorMessage: string, options: ApiRequestOptions = {}): Promise<T[]> {
    const response = await apiFetch(path, {
        auth: options.auth,
        errorMessage,
        headers: {
            Accept: "application/json",
        },
    });

    const raw = (await response.json()) as ApiResponse<T[]>;

    if (raw?.success !== true || !Array.isArray(raw.data)) {
        throw new Error(`${errorMessage} Geçersiz API cevabı alındı.`);
    }

    return raw.data;
}

export function fetchFx(options?: ApiRequestOptions) {
    return fetchCollection<FxResponse>("/api/v1/fx", "Döviz verileri yüklenemedi.", options);
}

export function fetchBonds(options?: ApiRequestOptions) {
    return fetchCollection<BondResponse>("/api/v1/bonds", "Tahvil verileri yüklenemedi.", options);
}

export function fetchFunds(options?: ApiRequestOptions) {
    return fetchCollection<FundResponse>("/api/v1/funds", "Fon verileri yüklenemedi.", options);
}

export function fetchStocks(options?: ApiRequestOptions) {
    return fetchCollection<StockResponse>("/api/v1/stocks", "Hisse verileri yüklenemedi.", options);
}
