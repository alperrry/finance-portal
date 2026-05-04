import { apiFetch } from "./client";

export type ApiResponse<T> = {
    success: boolean;
    data: T;
};

export type PortfolioInstrumentType = "STOCK" | "FUND" | "CURRENCY" | "BOND";
export type TransactionType = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type TransactionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type DisplayCurrency = "TRY" | "USD" | "EUR";

export type PortfolioItemResponse = {
    id: number;
    instrumentType: PortfolioInstrumentType;
    instrumentId: number;
    instrumentSymbol: string | null;
    instrumentName: string | null;
    quantity: number;
    avgCost: number;
    currentPrice: number | null;
    currentValue: number | null;
    marketValue?: number | null;
    profitLoss: number | null;
    profitLossPct: number | null;
    profitLossPercentage?: number | null;
    dailyChange: number | null;
    dailyChangePercentage: number | null;
    priceTrend: number[];
    nativeCurrency: string | null;
};

export type PortfolioResponse = {
    id: number;
    name: string;
    displayCurrency: DisplayCurrency;
    totalValue: number | null;
    totalCostBasis: number | null;
    totalProfitLoss: number | null;
    totalProfitLossPct: number | null;
    items: PortfolioItemResponse[];
    createdAt: string | null;
    updatedAt: string | null;
};

export type TradeRequest = {
    instrumentType: PortfolioInstrumentType;
    instrumentId: number;
    transactionType: TransactionType;
    orderType: OrderType;
    quantity: number;
    targetPrice: number | null;
};

export type TradeResponse = {
    id: number;
    portfolioId: number;
    instrumentType: PortfolioInstrumentType;
    instrumentId: number;
    instrumentSymbol: string;
    instrumentName: string | null;
    transactionType: TransactionType;
    orderType: OrderType;
    quantity: number;
    targetPrice: number | null;
    executedPrice: number | null;
    totalAmount: number | null;
    realizedProfitLoss: number | null;
    status: TransactionStatus;
    rejectionReason: string | null;
    processedAt: string | null;
    createdAt: string | null;
};

export type CreatePortfolioRequest = {
    name: string;
    displayCurrency: DisplayCurrency;
};

export type UpdatePortfolioRequest = {
    name: string;
};

export type PageResponse<T> = {
    content: T[];
    number: number;
    size: number;
    totalPages: number;
    totalElements: number;
    first: boolean;
    last: boolean;
};

type RawPageResponse<T> = Partial<PageResponse<T>> & {
    page?: {
        number?: number;
        size?: number;
        totalPages?: number;
        totalElements?: number;
    };
};

async function parseApiResponse<T>(response: Response, errorMessage: string): Promise<T> {
    const raw = (await response.json()) as ApiResponse<T>;

    if (raw?.success !== true) {
        throw new Error(`${errorMessage} Geçersiz API cevabı alındı.`);
    }

    return raw.data;
}

function normalizePage<T>(raw: RawPageResponse<T>, fallbackSize: number): PageResponse<T> {
    const pageMeta = raw.page ?? {};
    const number = raw.number ?? pageMeta.number ?? 0;
    const size = raw.size ?? pageMeta.size ?? fallbackSize;
    const totalPages = raw.totalPages ?? pageMeta.totalPages ?? 0;
    const totalElements = raw.totalElements ?? pageMeta.totalElements ?? 0;

    return {
        content: raw.content ?? [],
        number,
        size,
        totalPages,
        totalElements,
        first: raw.first ?? number <= 0,
        last: raw.last ?? (totalPages <= 1 || number >= totalPages - 1),
    };
}

export async function fetchPortfolios(): Promise<PortfolioResponse[]> {
    const response = await apiFetch("/api/v1/portfolios", {
        errorMessage: "Portföyler yüklenemedi.",
    });
    return parseApiResponse<PortfolioResponse[]>(response, "Portföyler yüklenemedi.");
}

export async function fetchPortfolio(id: number): Promise<PortfolioResponse> {
    const response = await apiFetch(`/api/v1/portfolios/${id}`, {
        errorMessage: "Portföy detayı yüklenemedi.",
    });
    return parseApiResponse<PortfolioResponse>(response, "Portföy detayı yüklenemedi.");
}

export async function createPortfolio(payload: CreatePortfolioRequest): Promise<PortfolioResponse> {
    const response = await apiFetch("/api/v1/portfolios", {
        method: "POST",
        errorMessage: "Portföy oluşturulamadı.",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<PortfolioResponse>(response, "Portföy oluşturulamadı.");
}

export async function updatePortfolio(id: number, payload: UpdatePortfolioRequest): Promise<PortfolioResponse> {
    const response = await apiFetch(`/api/v1/portfolios/${id}`, {
        method: "PATCH",
        errorMessage: "Portföy güncellenemedi.",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<PortfolioResponse>(response, "Portföy güncellenemedi.");
}

export async function deletePortfolio(id: number): Promise<void> {
    await apiFetch(`/api/v1/portfolios/${id}`, {
        method: "DELETE",
        errorMessage: "Portföy silinemedi.",
    });
}

export async function submitTrade(portfolioId: number, payload: TradeRequest): Promise<TradeResponse> {
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/trades`, {
        method: "POST",
        errorMessage: "İşlem talebi gönderilemedi.",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<TradeResponse>(response, "İşlem talebi gönderilemedi.");
}

export async function fetchPortfolioTrades(
    portfolioId: number,
    options: { status?: TransactionStatus | ""; page?: number; size?: number } = {},
): Promise<PageResponse<TradeResponse>> {
    const params = new URLSearchParams();
    if (options.status) params.set("status", options.status);
    params.set("page", String(options.page ?? 0));
    params.set("size", String(options.size ?? 10));
    params.set("sort", "createdAt,desc");

    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/trades?${params.toString()}`, {
        errorMessage: "İşlem geçmişi yüklenemedi.",
    });
    const data = await parseApiResponse<RawPageResponse<TradeResponse>>(response, "İşlem geçmişi yüklenemedi.");
    return normalizePage(data, options.size ?? 10);
}

export async function fetchPortfolioTradesSince(portfolioId: number, since: string): Promise<TradeResponse[]> {
    const params = new URLSearchParams();
    params.set("since", since);

    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/trades/since?${params.toString()}`, {
        errorMessage: "Kaçırılan işlem güncellemeleri yüklenemedi.",
    });
    return parseApiResponse<TradeResponse[]>(response, "Kaçırılan işlem güncellemeleri yüklenemedi.");
}

export async function fetchTrade(portfolioId: number, tradeId: number): Promise<TradeResponse> {
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/trades/${tradeId}`, {
        errorMessage: "İşlem detayı yüklenemedi.",
    });
    return parseApiResponse<TradeResponse>(response, "İşlem detayı yüklenemedi.");
}

export async function cancelTrade(portfolioId: number, tradeId: number): Promise<void> {
    await apiFetch(`/api/v1/portfolios/${portfolioId}/trades/${tradeId}`, {
        method: "DELETE",
        errorMessage: "İşlem iptal edilemedi.",
    });
}
