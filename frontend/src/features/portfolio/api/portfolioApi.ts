import { apiFetch } from "../../../services/api/client";

export type ApiResponse<T> = {
    success: boolean;
    data: T;
};

export type PortfolioInstrumentType = "STOCK" | "FUND" | "CURRENCY" | "BOND" | "VIOP" | "DEPOSIT";
export type DisplayCurrency = "TRY" | "USD" | "EUR";
export type SimulationLensType = "NOMINAL_TRY" | "USD" | "INFLATION_ADJUSTED";

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

// ── Manuel Pozisyon ──────────────────────────────────────────────────────────

export type PositionKind = "OPEN" | "CLOSED";
export type PositionDirection = "LONG" | "SHORT";

export type ManualPositionRequest = {
    instrumentType: PortfolioInstrumentType;
    positionKind: PositionKind;
    instrumentId?: number | null;
    instrumentSymbol?: string | null;
    instrumentName?: string | null;
    direction?: PositionDirection;
    quantity: number;
    entryPrice: number;
    entryDate: string;
    exitPrice?: number | null;
    exitDate?: string | null;
    contractMultiplier?: number | null;
    maturityDate?: string | null;
    marginAmount?: number | null;
    underlyingSymbol?: string | null;
    interestRate?: number | null;
    bankName?: string | null;
    notes?: string | null;
};

export type ManualPositionResponse = {
    id: number;
    portfolioId: number;
    instrumentType: PortfolioInstrumentType;
    positionKind: PositionKind;
    instrumentId: number | null;
    instrumentSymbol: string | null;
    instrumentName: string | null;
    direction: PositionDirection;
    quantity: number;
    entryPrice: number;
    entryDate: string;
    exitPrice: number | null;
    exitDate: string | null;
    contractMultiplier: number | null;
    maturityDate: string | null;
    marginAmount: number | null;
    underlyingSymbol: string | null;
    interestRate: number | null;
    bankName: string | null;
    realizedPnl: number | null;
    unrealizedPnl: number | null;
    currentPrice: number | null;
    currentValue: number | null;
    pnlPercent: number | null;
    notes: string | null;
    createdAt: string | null;
};

export async function createManualPosition(portfolioId: number, payload: ManualPositionRequest): Promise<ManualPositionResponse> {
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions`, {
        method: "POST",
        errorMessage: "Pozisyon kaydedilemedi.",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<ManualPositionResponse>(response, "Pozisyon kaydedilemedi.");
}

export async function fetchManualPositions(portfolioId: number, kind?: PositionKind, page = 0, size = 50): Promise<PageResponse<ManualPositionResponse>> {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    params.set("page", String(page));
    params.set("size", String(size));

    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions?${params.toString()}`, {
        errorMessage: "Pozisyonlar yüklenemedi.",
    });
    const data = await parseApiResponse<RawPageResponse<ManualPositionResponse>>(response, "Pozisyonlar yüklenemedi.");
    return normalizePage(data, size);
}

export async function fetchManualPosition(portfolioId: number, positionId: number): Promise<ManualPositionResponse> {
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions/${positionId}`, {
        errorMessage: "Pozisyon detayı yüklenemedi.",
    });
    return parseApiResponse<ManualPositionResponse>(response, "Pozisyon detayı yüklenemedi.");
}

export async function deleteManualPosition(portfolioId: number, positionId: number): Promise<void> {
    await apiFetch(`/api/v1/portfolios/${portfolioId}/positions/${positionId}`, {
        method: "DELETE",
        errorMessage: "Pozisyon silinemedi.",
    });
}

export type ClosePositionRequest = {
    exitPrice: number;
    exitDate: string;
    quantity: number;
};

export async function closeManualPosition(portfolioId: number, positionId: number, payload: ClosePositionRequest): Promise<ManualPositionResponse[]> {
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions/${positionId}/close`, {
        method: "POST",
        errorMessage: "Pozisyon kapatılamadı.",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<ManualPositionResponse[]>(response, "Pozisyon kapatılamadı.");
}

// ── Simülasyon ───────────────────────────────────────────────────────────────

export type SimulationPositionSummary = {
    id: number;
    instrumentSymbol: string | null;
    instrumentName: string | null;
    instrumentType: PortfolioInstrumentType;
    quantity: number;
    entryDate: string | null;
    positionKind: string;
};

export type SimulationLensResult = {
    type: SimulationLensType;
    costBasis: number;
    currentValue: number;
    absolutePnl: number;
    percentagePnl: number;
    currency: string;
    purchaseRate: number | null;
    referenceRate: number | null;
    referenceDate: string | null;
};

export type SimulationResponse = {
    summary: SimulationPositionSummary;
    baseline: SimulationLensResult;
    lenses: Partial<Record<SimulationLensType, SimulationLensResult>>;
};

function buildSimulationQuery(lenses: SimulationLensType[]) {
    const params = new URLSearchParams();
    lenses.forEach((lens) => params.append("lens", lens));
    return params.toString();
}

export async function fetchManualPositionSimulation(positionId: number, lenses: SimulationLensType[] = ["USD", "INFLATION_ADJUSTED"]): Promise<SimulationResponse> {
    const response = await apiFetch(`/api/v1/portfolio/manual-positions/${positionId}/simulation?${buildSimulationQuery(lenses)}`, {
        errorMessage: "Simülasyon hesaplanamadı.",
    });
    return parseApiResponse<SimulationResponse>(response, "Simülasyon hesap lanamadı.");
}
// Alternatif Senaryo (What-If / Gölge Pozisyon) için yeni API çağrısı
export async function fetchWhatIfSimulation(
    positionId: number,
    targetType: string,
    targetSymbol: string,
    lenses: SimulationLensType[] = ["NOMINAL_TRY"]
): Promise<SimulationResponse> {
    const params = new URLSearchParams();
    params.append("targetType", targetType);
    params.append("targetSymbol", targetSymbol);

    lenses.forEach(lens => params.append("lens", lens));

    const response = await apiFetch(
        `/api/v1/portfolio/manual-positions/${positionId}/what-if?${params.toString()}`,
        { errorMessage: "Alternatif senaryo hesaplanamadı." }
    );

    return parseApiResponse<SimulationResponse>(response, "Alternatif senaryo hesaplanamadı.");
}