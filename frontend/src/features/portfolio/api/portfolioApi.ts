import { apiFetch } from "../../../services/api/client";
import i18n from "../../../i18n";

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
        throw new Error(`${errorMessage} ${i18n.t("portfolio.errors.invalidApi")}`);
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
    const msg = i18n.t("portfolio.errors.listFailed");
    const response = await apiFetch("/api/v1/portfolios", { errorMessage: msg });
    return parseApiResponse<PortfolioResponse[]>(response, msg);
}

export async function fetchPortfolio(id: number): Promise<PortfolioResponse> {
    const msg = i18n.t("portfolio.errors.detailFailed");
    const response = await apiFetch(`/api/v1/portfolios/${id}`, { errorMessage: msg });
    return parseApiResponse<PortfolioResponse>(response, msg);
}

export async function createPortfolio(payload: CreatePortfolioRequest): Promise<PortfolioResponse> {
    const msg = i18n.t("portfolio.errors.createFailed");
    const response = await apiFetch("/api/v1/portfolios", {
        method: "POST",
        errorMessage: msg,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<PortfolioResponse>(response, msg);
}

export async function updatePortfolio(id: number, payload: UpdatePortfolioRequest): Promise<PortfolioResponse> {
    const msg = i18n.t("portfolio.errors.updateFailed");
    const response = await apiFetch(`/api/v1/portfolios/${id}`, {
        method: "PATCH",
        errorMessage: msg,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<PortfolioResponse>(response, msg);
}

export async function deletePortfolio(id: number): Promise<void> {
    await apiFetch(`/api/v1/portfolios/${id}`, {
        method: "DELETE",
        errorMessage: i18n.t("portfolio.errors.deleteFailed"),
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
    const msg = i18n.t("portfolio.errors.positionSaveFailed");
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions`, {
        method: "POST",
        errorMessage: msg,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<ManualPositionResponse>(response, msg);
}

export async function fetchManualPositions(portfolioId: number, kind?: PositionKind, page = 0, size = 50): Promise<PageResponse<ManualPositionResponse>> {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    params.set("page", String(page));
    params.set("size", String(size));

    const msg = i18n.t("portfolio.errors.positionsFailed");
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions?${params.toString()}`, {
        errorMessage: msg,
    });
    const data = await parseApiResponse<RawPageResponse<ManualPositionResponse>>(response, msg);
    return normalizePage(data, size);
}

export async function fetchManualPosition(portfolioId: number, positionId: number): Promise<ManualPositionResponse> {
    const msg = i18n.t("portfolio.errors.positionDetailFailed");
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions/${positionId}`, {
        errorMessage: msg,
    });
    return parseApiResponse<ManualPositionResponse>(response, msg);
}

export async function deleteManualPosition(portfolioId: number, positionId: number): Promise<void> {
    await apiFetch(`/api/v1/portfolios/${portfolioId}/positions/${positionId}`, {
        method: "DELETE",
        errorMessage: i18n.t("portfolio.errors.positionDeleteFailed"),
    });
}

export type ClosePositionRequest = {
    exitPrice: number;
    exitDate: string;
    quantity: number;
};

export async function closeManualPosition(portfolioId: number, positionId: number, payload: ClosePositionRequest): Promise<ManualPositionResponse[]> {
    const msg = i18n.t("portfolio.errors.positionCloseFailed");
    const response = await apiFetch(`/api/v1/portfolios/${portfolioId}/positions/${positionId}/close`, {
        method: "POST",
        errorMessage: msg,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return parseApiResponse<ManualPositionResponse[]>(response, msg);
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
    const msg = i18n.t("portfolio.errors.simulationFailed");
    const response = await apiFetch(`/api/v1/portfolio/manual-positions/${positionId}/simulation?${buildSimulationQuery(lenses)}`, {
        errorMessage: msg,
    });
    return parseApiResponse<SimulationResponse>(response, msg);
}

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

    const msg = i18n.t("portfolio.errors.whatIfFailed");
    const response = await apiFetch(
        `/api/v1/portfolio/manual-positions/${positionId}/what-if?${params.toString()}`,
        { errorMessage: msg }
    );
    return parseApiResponse<SimulationResponse>(response, msg);
}