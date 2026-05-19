import { API_BASE, apiFetch, type ApiAuthMode } from "../../../services/api/client";

export type ApiResponse<T> = {
    success: boolean;
    data: T;
};

export type FxResponse = {
    id?: number;
    currencyCode: string;
    currencyName: string;
    unit: number;
    forexBuying: number | null;
    forexSelling: number | null;
    banknoteBuying: number | null;
    banknoteSelling: number | null;
    rateDate: string | null;
};

export type BondResponse = {
    id?: number;
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
    id?: number;
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
    id?: number;
    symbol: string;
    shortName: string | null;
    longName: string | null;
    sector: string | null;
    indexName: string | null;
    instrumentType: "STOCK" | "INDEX" | "COMMODITY" | "CRYPTO";
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

export type MacroObservationResponse = {
    seriesId: number;
    seriesCode: string;
    name: string;
    dataType: string;
    date: string | null;
    value: number | null;
    monthlyChangePercent: number | null;
    annualChangePercent: number | null;
    unit: string | null;
};

export type ViopContractPriceResponse = {
    id: number;
    marketSegment: string | null;
    contractName: string;
    underlyingSymbol: string | null;
    maturityText: string | null;
    lastPrice: number | null;
    changePercent: number | null;
    changeAmount: number | null;
    volumeTry: number | null;
    volumeQuantity: number | null;
    tradeDate: string | null;
    fetchedAt: string | null;
};

export { API_BASE };

type ApiRequestOptions = {
    auth?: ApiAuthMode;
    includeUnpriced?: boolean;
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
    const params = new URLSearchParams();
    if (options?.includeUnpriced) params.set("includeUnpriced", "true");
    const query = params.toString();
    return fetchCollection<BondResponse>(`/api/v1/bonds${query ? `?${query}` : ""}`, "Tahvil verileri yüklenemedi.", options);
}

export function fetchFunds(options?: ApiRequestOptions) {
    const params = new URLSearchParams();
    if (options?.includeUnpriced) params.set("includeUnpriced", "true");
    const query = params.toString();
    return fetchCollection<FundResponse>(`/api/v1/funds${query ? `?${query}` : ""}`, "Fon verileri yüklenemedi.", options);
}

export function fetchStocks(options?: ApiRequestOptions, type: StockResponse["instrumentType"] = "STOCK") {
    return fetchCollection<StockResponse>(`/api/v1/stocks?type=${encodeURIComponent(type)}`, "Hisse verileri yüklenemedi.", options);
}

export function fetchMacroInflation(options?: ApiRequestOptions) {
    return fetchCollection<MacroObservationResponse>("/api/v1/macro/inflation", "Enflasyon verileri yüklenemedi.", options);
}

export function fetchMacroDepositRates(options?: ApiRequestOptions) {
    return fetchCollection<MacroObservationResponse>("/api/v1/macro/deposit-rates", "Mevduat faizi verileri yüklenemedi.", options);
}

export function fetchViop(options?: ApiRequestOptions) {
    return fetchCollection<ViopContractPriceResponse>("/api/v1/viop", "VİOP verileri yüklenemedi.", options);
}

export function fetchViopLatest(options?: ApiRequestOptions) {
    return fetchCollection<ViopContractPriceResponse>("/api/v1/viop/latest", "VİOP verileri yüklenemedi.", options);
}

export type FundAllocationResponse = {
    allocationDate: string | null;
    hs: number | null;
    yhs: number | null;
    kb: number | null;
    ob: number | null;
    ykb: number | null;
    yob: number | null;
    tpp: number | null;
    vdm: number | null;
    vm: number | null;
    r: number | null;
    t: number | null;
    d: number | null;
    gas: number | null;
    byf: number | null;
    vint: number | null;
    diger: number | null;
};

export async function fetchFundAllocation(code: string, options: ApiRequestOptions = {}): Promise<FundAllocationResponse> {
    const response = await apiFetch(`/api/v1/funds/${encodeURIComponent(code)}/allocation`, {
        auth: options.auth,
        errorMessage: "Fon portföy dağılımı yüklenemedi.",
        headers: { Accept: "application/json" },
    });
    const raw = (await response.json()) as ApiResponse<FundAllocationResponse>;
    if (raw?.success !== true || !raw.data) {
        throw new Error("Fon portföy dağılımı yüklenemedi. Geçersiz API cevabı alındı.");
    }
    return raw.data;
}
