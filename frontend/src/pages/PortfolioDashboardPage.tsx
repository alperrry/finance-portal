import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ApiError } from "../api/client";
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
import {
    cancelTrade,
    createPortfolio,
    deletePortfolio,
    fetchPortfolio,
    fetchPortfolios,
    fetchPortfolioTrades,
    submitTrade,
    updatePortfolio,
    type CreatePortfolioRequest,
    type DisplayCurrency,
    type PageResponse,
    type PortfolioInstrumentType,
    type PortfolioItemResponse,
    type PortfolioResponse,
    type TradeRequest,
    type TradeResponse,
    type TransactionStatus,
    type TransactionType,
} from "../api/portfolio";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastContext";
import { KapitalShell } from "../components/layout";
import { useTradeNotifications } from "../hooks/useTradeNotifications";
import "./PortfolioDashboardPage.css";

type PortfolioLoadState = {
    loading: boolean;
    error: string | null;
};

type DetailState = {
    loading: boolean;
    error: string | null;
    data: PortfolioResponse | null;
};

type TradeHistoryState = {
    loading: boolean;
    error: string | null;
    page: PageResponse<TradeResponse> | null;
};

type InstrumentOption = {
    id: number;
    type: PortfolioInstrumentType;
    symbol: string;
    name: string;
    price: number | null;
    currency: string;
};

type PortfolioFormState = {
    mode: "create" | "edit";
    portfolio?: PortfolioResponse;
};

const TRADE_PAGE_SIZE = 8;
const CHART_COLORS: Record<PortfolioInstrumentType, string> = {
    STOCK: "#2f7fc1",
    FUND: "#6c9f42",
    CURRENCY: "#c1622f",
    BOND: "#8b6bc8",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
    PENDING: "Bekleyen",
    APPROVED: "Onaylanan",
    REJECTED: "Reddedilen",
    CANCELLED: "İptal edilen",
};

const INSTRUMENT_LABELS: Record<PortfolioInstrumentType, string> = {
    STOCK: "Hisse",
    FUND: "Fon",
    CURRENCY: "Döviz",
    BOND: "Tahvil",
};

const TRANSACTION_LABELS: Record<TransactionType, string> = {
    BUY: "AL",
    SELL: "SAT",
};

const CURRENCIES: DisplayCurrency[] = ["TRY", "USD", "EUR"];
const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
type FxRateMap = Partial<Record<DisplayCurrency, number>>;

function toNumber(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: number | null | undefined, digits = 2) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
}

function formatQuantity(value: number | null | undefined) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(normalized);
}

function formatMoney(value: number | null | undefined, currency = "TRY", digits = 2) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    try {
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).format(normalized);
    } catch {
        return `${formatNumber(normalized, digits)} ${currency}`;
    }
}

function formatPercent(value: number | null | undefined) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, 2)}%`;
}

function formatSignedMoney(value: number | null | undefined, currency = "TRY") {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatMoney(normalized, currency)}`;
}

function formatProfitLossSummary(value: number | null | undefined, pct: number | null | undefined, currency = "TRY") {
    const hasValue = toNumber(value) !== null;
    const hasPct = toNumber(pct) !== null;
    if (!hasValue && !hasPct) return "-";
    if (!hasPct) return formatSignedMoney(value, currency);
    return `${formatSignedMoney(value, currency)} (${formatPercent(pct)})`;
}

function currencyBadgeClass(currency: string) {
    const normalized = currency.toLowerCase();
    if (normalized === "try" || normalized === "usd" || normalized === "eur" || normalized === "btc") {
        return `portfolio-currency-badge currency-${normalized}`;
    }
    return "portfolio-currency-badge currency-other";
}

function buildFxRateMap(items: FxResponse[]): FxRateMap {
    return items.reduce<FxRateMap>((rates, item) => {
        if ((item.currencyCode === "USD" || item.currencyCode === "EUR") && typeof item.forexBuying === "number") {
            rates[item.currencyCode] = item.forexBuying;
        }
        return rates;
    }, { TRY: 1 });
}

function convertMoneyValue(
    amount: number | null,
    fromCurrency: string | null | undefined,
    toCurrency: string,
    rates: FxRateMap,
) {
    if (amount === null || !Number.isFinite(amount)) return null;
    const from = (fromCurrency || "TRY").toUpperCase() as DisplayCurrency;
    const to = (toCurrency || "TRY").toUpperCase() as DisplayCurrency;
    if (from === to) return amount;

    const fromRate = from === "TRY" ? 1 : rates[from];
    const toRate = to === "TRY" ? 1 : rates[to];
    if (!fromRate || !toRate) return null;

    const amountInTry = amount * fromRate;
    return to === "TRY" ? amountInTry : amountInTry / toRate;
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function resolveApiError(caughtError: unknown, fallback: string) {
    if (caughtError instanceof ApiError) {
        return caughtError.payload?.message || caughtError.message || fallback;
    }
    if (caughtError instanceof Error) return caughtError.message;
    return fallback;
}

function getProfitTone(value: number | null | undefined) {
    const normalized = toNumber(value);
    if (normalized === null || normalized === 0) return "neutral";
    return normalized > 0 ? "up" : "down";
}

function statusTone(status: TransactionStatus) {
    if (status === "PENDING") return "warning";
    if (status === "APPROVED") return "success";
    if (status === "REJECTED") return "error";
    return "muted";
}

function instrumentRoute(item: PortfolioItemResponse) {
    const symbol = item.instrumentSymbol;
    if (!symbol) return null;

    const type = item.instrumentType === "CURRENCY"
        ? "fx"
        : item.instrumentType === "STOCK"
          ? "stocks"
          : item.instrumentType === "FUND"
            ? "funds"
            : "bonds";

    return `/portfolio/${type}/${encodeURIComponent(symbol)}`;
}

function buildAllocationData(items: PortfolioItemResponse[]) {
    return items
        .map((item) => ({
            id: item.id,
            name: item.instrumentSymbol || `${INSTRUMENT_LABELS[item.instrumentType]} #${item.instrumentId}`,
            type: item.instrumentType,
            value: toNumber(item.currentValue) ?? 0,
        }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value);
}

function PortfolioCard({
    portfolio,
    onOpen,
    onEdit,
    onDelete,
}: {
    portfolio: PortfolioResponse;
    onOpen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const profitTone = getProfitTone(portfolio.totalProfitLoss);
    const itemCount = portfolio.items?.length ?? 0;
    const hasPositions = itemCount > 0;
    const valueNote = portfolio.totalValue === null ? "Değerleme için detay sayfasını açın" : "Pozisyon değeri";

    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
    };

    return (
        <article className="portfolio-card" tabIndex={0} role="button" onClick={onOpen} onKeyDown={onKeyDown}>
            <div className="portfolio-card-top">
                <div>
                    <h2>{portfolio.name}</h2>
                    <span className={currencyBadgeClass(portfolio.displayCurrency)}>{portfolio.displayCurrency}</span>
                </div>
                <div className="portfolio-card-actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={onEdit} aria-label={`${portfolio.name} düzenle`}>Düzenle</button>
                    <button type="button" className="danger" onClick={onDelete} aria-label={`${portfolio.name} sil`}>Sil</button>
                </div>
            </div>

            {hasPositions ? (
                <>
                    <div className="portfolio-card-value">{formatMoney(portfolio.totalValue, portfolio.displayCurrency)}</div>
                    <div className="portfolio-card-note">{valueNote}</div>
                </>
            ) : (
                <div className="portfolio-card-empty-copy">
                    <strong>Henüz pozisyon eklenmedi</strong>
                    <span>İşleme başla →</span>
                </div>
            )}

            <div className="portfolio-card-bottom">
                {hasPositions ? (
                    <span className={`portfolio-pnl ${profitTone}`.trim()}>
                        {formatSignedMoney(portfolio.totalProfitLoss, portfolio.displayCurrency)}
                        <small>{formatPercent(portfolio.totalProfitLossPct)}</small>
                    </span>
                ) : (
                    <span className="portfolio-muted">Portföy hazır</span>
                )}
                <span>{itemCount > 0 ? `${itemCount} enstrüman` : "Pozisyon yok"}</span>
            </div>
        </article>
    );
}

function PortfolioFormModal({
    state,
    busy,
    error,
    onClose,
    onSubmit,
}: {
    state: PortfolioFormState;
    busy: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (payload: CreatePortfolioRequest) => void;
}) {
    const [name, setName] = useState(state.portfolio?.name ?? "");
    const [currency, setCurrency] = useState<DisplayCurrency>(state.portfolio?.displayCurrency ?? "TRY");
    const title = state.mode === "create" ? "Yeni Portföy" : "Portföyü Düzenle";

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;
        onSubmit({ name: trimmedName, displayCurrency: currency });
    };

    return (
        <div className="portfolio-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section className="portfolio-modal" role="dialog" aria-modal="true" aria-labelledby="portfolio-form-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="portfolio-modal-head">
                    <div>
                        <span className="portfolio-kicker">Portföy</span>
                        <h2 id="portfolio-form-title">{title}</h2>
                    </div>
                    <button type="button" className="portfolio-icon-btn" onClick={onClose} aria-label="Kapat">×</button>
                </div>

                <form className="portfolio-form" onSubmit={submit}>
                    <label>
                        <span>Portföy Adı</span>
                        <input maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder="Uzun vadeli yatırım" autoFocus />
                    </label>

                    <label>
                        <span>Para Birimi</span>
                        <select value={currency} disabled={state.mode === "edit"} onChange={(event) => setCurrency(event.target.value as DisplayCurrency)}>
                            {CURRENCIES.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </label>

                    {state.mode === "edit" ? <p className="portfolio-form-note">Para birimi mevcut pozisyon değerlemeleriyle uyum için sonradan değiştirilemez.</p> : null}
                    {error ? <div className="portfolio-inline-error">{error}</div> : null}

                    <div className="portfolio-modal-actions">
                        <button type="button" className="portfolio-secondary-btn" onClick={onClose}>İptal</button>
                        <button type="submit" className="portfolio-primary-btn" disabled={busy || !name.trim()}>
                            {busy ? "Kaydediliyor..." : state.mode === "create" ? "Oluştur" : "Kaydet"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function DeletePortfolioConfirm({
    portfolio,
    busy,
    error,
    onClose,
    onConfirm,
    onOpenDetail,
}: {
    portfolio: PortfolioResponse;
    busy: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: () => void;
    onOpenDetail: () => void;
}) {
    return (
        <div className="portfolio-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section className="portfolio-modal compact" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <div className="portfolio-modal-head">
                    <div>
                        <span className="portfolio-kicker danger">Silme Onayı</span>
                        <h2>{portfolio.name} silinsin mi?</h2>
                    </div>
                    <button type="button" className="portfolio-icon-btn" onClick={onClose} aria-label="Kapat">×</button>
                </div>
                <p className="portfolio-confirm-copy">
                    Bu portföyü silmek istediğine emin misin? İçinde pozisyon veya bekleyen emir varsa silme engellenir.
                </p>
                {error ? (
                    <div className="portfolio-inline-error">
                        {error}
                        {error.includes("pozisyon") ? (
                            <button type="button" className="portfolio-link-btn" onClick={onOpenDetail}>Detaya git</button>
                        ) : null}
                    </div>
                ) : null}
                <div className="portfolio-modal-actions">
                    <button type="button" className="portfolio-secondary-btn" onClick={onClose}>Vazgeç</button>
                    <button type="button" className="portfolio-danger-btn" onClick={onConfirm} disabled={busy}>
                        {busy ? "Siliniyor..." : "Sil"}
                    </button>
                </div>
            </section>
        </div>
    );
}

type AllocationTooltipProps = {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number | string }>;
    total: number;
    currency: string;
};

function AllocationTooltip({ active, payload, total, currency }: AllocationTooltipProps) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const value = Number(item.value ?? 0);
    const pct = total > 0 ? (value / total) * 100 : 0;

    return (
        <div className="portfolio-chart-tooltip">
            <strong>{item.name}</strong>
            <span>{formatMoney(value, currency)}</span>
            <small>{formatPercent(pct)}</small>
        </div>
    );
}

function PortfolioAllocationChart({ portfolio, onNewTrade }: { portfolio: PortfolioResponse; onNewTrade: () => void }) {
    const data = useMemo(() => buildAllocationData(portfolio.items ?? []), [portfolio.items]);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (data.length === 0) {
        return (
            <div className="portfolio-chart-empty">
                <span className="portfolio-chart-empty-icon" aria-hidden="true">▦</span>
                <strong>Henüz pozisyon yok</strong>
                <span>İlk işlemini eklediğinde portföy dağılımı burada görünecek.</span>
                <button type="button" className="portfolio-primary-btn" onClick={onNewTrade}>+ Yeni İşlem</button>
            </div>
        );
    }

    return (
        <div className="portfolio-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" innerRadius={64} outerRadius={104} paddingAngle={3}>
                        {data.map((item) => (
                            <Cell key={item.id} fill={CHART_COLORS[item.type]} />
                        ))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip total={total} currency={portfolio.displayCurrency} />} />
                    <Legend formatter={(value) => <span className="portfolio-chart-legend">{value}</span>} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

function PortfolioMetrics({ portfolio, currentBalance }: { portfolio: PortfolioResponse; currentBalance: number | null }) {
    const balanceLabel = portfolio.displayCurrency === "TRY" ? "Mevcut Bakiye" : "Mevcut Bakiye (TRY)";
    const metrics = [
        { label: balanceLabel, value: formatMoney(currentBalance, "TRY"), caption: "Harcanabilir" },
        { label: "Pozisyon Değeri", value: formatMoney(portfolio.totalValue, portfolio.displayCurrency), caption: "Bu portföy" },
        {
            label: "Kâr/Zarar",
            value: formatProfitLossSummary(portfolio.totalProfitLoss, portfolio.totalProfitLossPct, portfolio.displayCurrency),
            caption: "Tüm zamanlar",
            tone: getProfitTone(portfolio.totalProfitLoss),
        },
    ];

    return (
        <section className="portfolio-metrics-grid">
            {metrics.map((metric) => (
                <article key={metric.label} className="portfolio-metric-card">
                    <span>{metric.label}</span>
                    <strong className={metric.tone ?? ""}>{metric.value}</strong>
                    <small>{metric.caption}</small>
                </article>
            ))}
        </section>
    );
}

function PositionsTable({ items, displayCurrency }: { items: PortfolioItemResponse[]; displayCurrency: string }) {
    const sortedItems = useMemo(
        () => [...items].sort((left, right) => (toNumber(right.currentValue) ?? 0) - (toNumber(left.currentValue) ?? 0)),
        [items],
    );

    if (sortedItems.length === 0) {
        return <div className="portfolio-empty-inline">Henüz pozisyon yok, ilk işlemini ekle.</div>;
    }

    return (
        <div className="portfolio-table-wrap">
            <table className="portfolio-table">
                <thead>
                    <tr>
                        <th>Enstrüman</th>
                        <th>Tip</th>
                        <th>Miktar</th>
                        <th>Ort. Maliyet</th>
                        <th>Güncel Fiyat</th>
                        <th>Güncel Değer</th>
                        <th>K/Z</th>
                        <th>K/Z %</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedItems.map((item) => {
                        const route = instrumentRoute(item);
                        const profitTone = getProfitTone(item.profitLoss);
                        return (
                            <tr key={item.id} className={route ? "portfolio-clickable-row" : ""} onClick={() => route && window.location.assign(route)}>
                                <td>
                                    <div className="portfolio-primary-cell">
                                        <strong>{item.instrumentSymbol ?? "-"}</strong>
                                        <span>{item.instrumentName ?? "Enstrüman"}</span>
                                    </div>
                                </td>
                                <td><span className={`portfolio-pill type-${item.instrumentType.toLowerCase()}`}>{INSTRUMENT_LABELS[item.instrumentType]}</span></td>
                                <td>{formatQuantity(item.quantity)}</td>
                                <td>{formatMoney(item.avgCost, item.nativeCurrency ?? "TRY", 4)}</td>
                                <td>{formatMoney(item.currentPrice, item.nativeCurrency ?? "TRY", 4)}</td>
                                <td>{formatMoney(item.currentValue, displayCurrency)}</td>
                                <td className={`portfolio-money-cell ${profitTone}`}>{formatSignedMoney(item.profitLoss, displayCurrency)}</td>
                                <td className={`portfolio-money-cell ${getProfitTone(item.profitLossPct)}`}>{formatPercent(item.profitLossPct)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TradeHistoryTable({
    state,
    status,
    displayCurrency,
    onStatusChange,
    onPageChange,
    onCancel,
    cancelingTradeId,
}: {
    state: TradeHistoryState;
    status: TransactionStatus | "";
    displayCurrency: string;
    onStatusChange: (status: TransactionStatus | "") => void;
    onPageChange: (page: number) => void;
    onCancel: (trade: TradeResponse) => void;
    cancelingTradeId: number | null;
}) {
    const page = state.page;

    return (
        <section className="portfolio-section">
            <div className="portfolio-section-head">
                <div>
                    <span className="portfolio-kicker">Lifecycle</span>
                    <h3>İşlem Geçmişi</h3>
                </div>
                <label className="portfolio-status-filter">
                    <span>Durum</span>
                    <select value={status} onChange={(event) => onStatusChange(event.target.value as TransactionStatus | "")}>
                        <option value="">Tümü</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </label>
            </div>

            {state.loading ? <div className="portfolio-empty-inline">İşlem geçmişi yükleniyor...</div> : null}
            {!state.loading && state.error ? <div className="portfolio-inline-error">{state.error}</div> : null}
            {!state.loading && !state.error && page && page.content.length === 0 ? (
                <div className="portfolio-empty-inline">Bu filtrede işlem yok.</div>
            ) : null}

            {!state.loading && !state.error && page && page.content.length > 0 ? (
                <>
                    <div className="portfolio-table-wrap">
                        <table className="portfolio-table compact">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Enstrüman</th>
                                    <th>Tip</th>
                                    <th>Miktar</th>
                                    <th>Hedef</th>
                                    <th>Gerçekleşme</th>
                                    <th>Tutar</th>
                                    <th>Durum</th>
                                    <th>Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {page.content.map((trade) => (
                                    <tr key={trade.id}>
                                        <td>{formatDateTime(trade.createdAt)}</td>
                                        <td>
                                            <div className="portfolio-primary-cell">
                                                <strong>{trade.instrumentSymbol || "Bilinmiyor"}</strong>
                                                <span>{trade.instrumentName || INSTRUMENT_LABELS[trade.instrumentType]}</span>
                                            </div>
                                        </td>
                                        <td><span className={`portfolio-trade-pill ${trade.transactionType.toLowerCase()}`}>{TRANSACTION_LABELS[trade.transactionType]}</span></td>
                                        <td>{formatQuantity(trade.quantity)}</td>
                                        <td>{formatNumber(trade.targetPrice, 4)}</td>
                                        <td>{formatNumber(trade.executedPrice, 4)}</td>
                                        <td>{formatMoney(trade.totalAmount, displayCurrency)}</td>
                                        <td><span className={`portfolio-status ${statusTone(trade.status)}`}>{STATUS_LABELS[trade.status]}</span></td>
                                        <td>
                                            {trade.status === "PENDING" ? (
                                                <button
                                                    type="button"
                                                    className="portfolio-table-action"
                                                    disabled={cancelingTradeId === trade.id}
                                                    onClick={() => onCancel(trade)}
                                                >
                                                    {cancelingTradeId === trade.id ? "İptal..." : "İptal"}
                                                </button>
                                            ) : (
                                                <span className="portfolio-muted">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="portfolio-pagination">
                        <span>{page.totalElements} kayıt · Sayfa {page.number + 1}/{Math.max(page.totalPages, 1)}</span>
                        <div>
                            <button type="button" disabled={page.first} onClick={() => onPageChange(Math.max(0, page.number - 1))}>Önceki</button>
                            <button type="button" disabled={page.last} onClick={() => onPageChange(page.number + 1)}>Sonraki</button>
                        </div>
                    </div>
                </>
            ) : null}
        </section>
    );
}

function PortfolioDetailPageContent({
    state,
    trades,
    tradeStatus,
    cancelingTradeId,
    currentBalance,
    onBack,
    onEdit,
    onDelete,
    onNewTrade,
    onStatusChange,
    onTradePageChange,
    onCancelTrade,
}: {
    state: DetailState;
    trades: TradeHistoryState;
    tradeStatus: TransactionStatus | "";
    cancelingTradeId: number | null;
    currentBalance: number | null;
    onBack: () => void;
    onEdit: (portfolio: PortfolioResponse) => void;
    onDelete: (portfolio: PortfolioResponse) => void;
    onNewTrade: () => void;
    onStatusChange: (status: TransactionStatus | "") => void;
    onTradePageChange: (page: number) => void;
    onCancelTrade: (trade: TradeResponse) => void;
}) {
    const portfolio = state.data;

    return (
        <div className="portfolio-detail-page">
            <div className="portfolio-detail-page-head">
                <button type="button" className="portfolio-secondary-btn" onClick={onBack}>Portföylere dön</button>
                <div>
                    <span className="portfolio-kicker">Portföy Detayı</span>
                    <h1>{portfolio?.name ?? "Yükleniyor"}</h1>
                </div>
            </div>

            {state.loading ? <div className="portfolio-detail-status">Portföy detayı yükleniyor...</div> : null}
            {!state.loading && state.error ? <div className="portfolio-inline-error">{state.error}</div> : null}

            {portfolio ? (
                <div className="portfolio-detail-body">
                    <section className="portfolio-detail-hero">
                        <div>
                            <div className="portfolio-detail-title-row">
                                <h2>{portfolio.name}</h2>
                                <button type="button" className="portfolio-small-btn" onClick={() => onEdit(portfolio)}>Düzenle</button>
                            </div>
                            <span className={currencyBadgeClass(portfolio.displayCurrency)}>{portfolio.displayCurrency}</span>
                        </div>
                        <button type="button" className="portfolio-primary-btn" onClick={onNewTrade}>+ Yeni İşlem</button>
                    </section>

                    <PortfolioMetrics portfolio={portfolio} currentBalance={currentBalance} />

                    <section className="portfolio-section">
                        <div className="portfolio-section-head">
                            <div>
                                <span className="portfolio-kicker">Portföy Dağılımı</span>
                                <h3>Pozisyonlar</h3>
                            </div>
                        </div>
                        <PortfolioAllocationChart portfolio={portfolio} onNewTrade={onNewTrade} />
                    </section>

                    <section className="portfolio-section">
                        <div className="portfolio-section-head">
                            <div>
                                <span className="portfolio-kicker">Pozisyonlar</span>
                                <h3>Pozisyonlar</h3>
                            </div>
                        </div>
                        <PositionsTable items={portfolio.items ?? []} displayCurrency={portfolio.displayCurrency} />
                    </section>

                    <TradeHistoryTable
                        state={trades}
                        status={tradeStatus}
                        displayCurrency={portfolio.displayCurrency}
                        onStatusChange={onStatusChange}
                        onPageChange={onTradePageChange}
                        onCancel={onCancelTrade}
                        cancelingTradeId={cancelingTradeId}
                    />

                    <section className="portfolio-danger-zone">
                        <div>
                            <span className="portfolio-kicker danger">Tehlikeli Bölge</span>
                            <p>Bu işlem geri alınamaz. Portföy ve tüm ilgili kayıtlar kalıcı olarak silinir.</p>
                        </div>
                        <button type="button" className="portfolio-danger-outline" onClick={() => onDelete(portfolio)}>
                            Portföyü Sil
                        </button>
                    </section>
                </div>
            ) : null}
        </div>
    );
}

function mapStockOption(item: StockResponse): InstrumentOption | null {
    if (!item.id) return null;
    return {
        id: item.id,
        type: "STOCK",
        symbol: item.symbol,
        name: item.shortName ?? item.longName ?? "Hisse",
        price: item.price,
        currency: item.currency ?? "TRY",
    };
}

function mapFundOption(item: FundResponse): InstrumentOption | null {
    if (!item.id) return null;
    return {
        id: item.id,
        type: "FUND",
        symbol: item.code,
        name: item.name,
        price: item.price,
        currency: "TRY",
    };
}

function mapFxOption(item: FxResponse): InstrumentOption | null {
    if (!item.id) return null;
    return {
        id: item.id,
        type: "CURRENCY",
        symbol: item.currencyCode,
        name: item.currencyName,
        price: item.forexBuying,
        currency: "TRY",
    };
}

function mapBondOption(item: BondResponse): InstrumentOption | null {
    if (!item.id) return null;
    return {
        id: item.id,
        type: "BOND",
        symbol: item.evdsSeriesCode,
        name: item.name,
        price: item.interestRate,
        currency: item.currency ?? "TRY",
    };
}

function NewTradeModal({
    portfolio,
    currentBalance,
    busy,
    serverError,
    onClose,
    onSubmit,
}: {
    portfolio: PortfolioResponse;
    currentBalance: number | null;
    busy: boolean;
    serverError: string | null;
    onClose: () => void;
    onSubmit: (payload: TradeRequest) => Promise<void>;
}) {
    const [transactionType, setTransactionType] = useState<TransactionType>("BUY");
    const [instrumentType, setInstrumentType] = useState<PortfolioInstrumentType>("STOCK");
    const [instrumentId, setInstrumentId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [targetPrice, setTargetPrice] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [options, setOptions] = useState<InstrumentOption[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [optionsError, setOptionsError] = useState<string | null>(null);
    const [fxRates, setFxRates] = useState<FxRateMap>({ TRY: 1 });
    const [fxRatesError, setFxRatesError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setFxRatesError(null);

        fetchFx()
            .then((items) => {
                if (!active) return;
                setFxRates(buildFxRateMap(items));
            })
            .catch((caughtError) => {
                if (!active) return;
                setFxRatesError(resolveApiError(caughtError, "Döviz dönüşüm kurları yüklenemedi."));
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        setOptionsLoading(true);
        setOptionsError(null);
        setOptions([]);
        setInstrumentId("");

        const load = async () => {
            try {
                const data = await (instrumentType === "STOCK"
                    ? fetchStocks().then((items) => items.map(mapStockOption))
                    : instrumentType === "FUND"
                      ? fetchFunds().then((items) => items.map(mapFundOption))
                      : instrumentType === "CURRENCY"
                        ? fetchFx().then((items) => items.map(mapFxOption))
                        : fetchBonds().then((items) => items.map(mapBondOption)));

                if (!active) return;
                const normalized = data
                    .filter((item): item is InstrumentOption => item !== null)
                    .sort((left, right) => collator.compare(left.symbol, right.symbol));
                setOptions(normalized);
            } catch (caughtError) {
                if (!active) return;
                setOptionsError(resolveApiError(caughtError, "Enstrüman listesi yüklenemedi."));
            } finally {
                if (active) setOptionsLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [instrumentType]);

    const selectedOption = options.find((option) => String(option.id) === instrumentId) ?? null;
    const selectedDisplayPrice = selectedOption?.price
        ? convertMoneyValue(selectedOption.price, selectedOption.currency, portfolio.displayCurrency, fxRates)
        : null;

    useEffect(() => {
        if (!selectedOption) return;
        if (instrumentType === "BOND" || targetPrice.trim() === "") {
            setTargetPrice(selectedDisplayPrice && selectedDisplayPrice > 0 ? String(Number(selectedDisplayPrice.toFixed(6))) : "");
        }
    }, [instrumentType, selectedDisplayPrice, selectedOption, targetPrice]);

    const quantityNumber = Number(quantity);
    const priceNumber = instrumentType === "BOND" && selectedDisplayPrice ? selectedDisplayPrice : Number(targetPrice);
    const totalAmount = Number.isFinite(quantityNumber) && Number.isFinite(priceNumber) ? quantityNumber * priceNumber : null;
    const requiredBalance = convertMoneyValue(totalAmount, portfolio.displayCurrency, "TRY", fxRates);
    const insufficientBalance = transactionType === "BUY"
        && currentBalance !== null
        && requiredBalance !== null
        && requiredBalance > currentBalance;
    const missingConversion = transactionType === "BUY" && totalAmount !== null && requiredBalance === null;
    const ownedQuantity = portfolio.items.find(
        (item) => item.instrumentType === instrumentType && String(item.instrumentId) === instrumentId,
    )?.quantity;

    const validate = () => {
        if (!instrumentId) return "Enstrüman seçmelisin.";
        if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) return "Miktar 0'dan büyük olmalı.";
        if (!Number.isFinite(priceNumber) || priceNumber <= 0) return "Hedef fiyat 0'dan büyük olmalı.";
        if (missingConversion) return "Bu işlem için güncel döviz dönüşüm kuru bulunamadı.";
        if (insufficientBalance) return "Bu işlem için bakiyeniz yetersiz.";
        return null;
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const validationError = validate();
        if (validationError) {
            setLocalError(validationError);
            return;
        }

        setLocalError(null);
        await onSubmit({
            instrumentType,
            instrumentId: Number(instrumentId),
            transactionType,
            quantity: quantityNumber,
            targetPrice: priceNumber,
        });
    };

    return (
        <div className="portfolio-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section className="portfolio-modal trade" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <div className="portfolio-modal-head">
                    <div>
                        <span className="portfolio-kicker">Trade Desk</span>
                        <h2>Yeni İşlem</h2>
                    </div>
                    <button type="button" className="portfolio-icon-btn" onClick={onClose} aria-label="Kapat">×</button>
                </div>

                <form className="portfolio-form" onSubmit={submit}>
                    <div className="portfolio-balance-strip">
                        <span>Mevcut Bakiye (TRY)</span>
                        <strong>{formatMoney(currentBalance, "TRY")}</strong>
                    </div>

                    <div className="portfolio-segmented" role="group" aria-label="İşlem tipi">
                        {(["BUY", "SELL"] as TransactionType[]).map((type) => (
                            <button
                                key={type}
                                type="button"
                                className={transactionType === type ? "active" : ""}
                                onClick={() => setTransactionType(type)}
                            >
                                {TRANSACTION_LABELS[type]}
                            </button>
                        ))}
                    </div>

                    <label>
                        <span>Enstrüman Tipi</span>
                        <select value={instrumentType} onChange={(event) => setInstrumentType(event.target.value as PortfolioInstrumentType)}>
                            <option value="STOCK">Hisse</option>
                            <option value="FUND">Fon</option>
                            <option value="CURRENCY">Döviz</option>
                            <option value="BOND">Tahvil</option>
                        </select>
                    </label>

                    <label>
                        <span>Enstrüman</span>
                        <select value={instrumentId} disabled={optionsLoading || options.length === 0} onChange={(event) => setInstrumentId(event.target.value)}>
                            <option value="">{optionsLoading ? "Yükleniyor..." : "Seçiniz"}</option>
                            {options.map((option) => (
                                <option key={`${option.type}-${option.id}`} value={option.id}>
                                    {option.symbol} — {option.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {optionsError ? <div className="portfolio-inline-error">{optionsError}</div> : null}
                    {fxRatesError ? <div className="portfolio-inline-error">{fxRatesError}</div> : null}
                    {selectedOption && selectedOption.currency !== portfolio.displayCurrency ? (
                        <p className="portfolio-form-note">
                            Güncel fiyat {formatMoney(selectedOption.price, selectedOption.currency, 4)} üzerinden {portfolio.displayCurrency} karşılığıyla işlem girilir.
                        </p>
                    ) : null}

                    <div className="portfolio-form-grid">
                        <label>
                            <span>Miktar</span>
                            <input type="number" min="0.000001" step="0.000001" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                        </label>
                        <label>
                            <span>Hedef Fiyat ({portfolio.displayCurrency})</span>
                            <input
                                type="number"
                                min="0.000001"
                                step="0.000001"
                                disabled={instrumentType === "BOND"}
                                value={targetPrice}
                                onChange={(event) => setTargetPrice(event.target.value)}
                            />
                        </label>
                    </div>

                    {instrumentType === "BOND" ? <p className="portfolio-form-note">Tahvil işlemi market order olarak anlık gerçekleştirilecek.</p> : null}
                    {transactionType === "SELL" && ownedQuantity !== undefined ? (
                        <p className="portfolio-form-note">Sahip olduğun miktar: {formatQuantity(ownedQuantity)}. Backend bekleyen satışları da kontrol eder.</p>
                    ) : transactionType === "SELL" ? (
                        <p className="portfolio-form-note warning">Bu enstrümanda pozisyon görünmüyor. Satış backend tarafından reddedilebilir.</p>
                    ) : null}

                    <div className={`portfolio-total-box ${insufficientBalance ? "danger" : ""}`.trim()}>
                        <span>Toplam Tutar</span>
                        <strong>{formatMoney(totalAmount, portfolio.displayCurrency)}</strong>
                    </div>

                    {transactionType === "BUY" && totalAmount !== null ? (
                        <div className="portfolio-balance-check">
                            <span>Bloke Edilecek Tutar</span>
                            <strong>{formatMoney(requiredBalance, "TRY")}</strong>
                        </div>
                    ) : null}

                    <p className="portfolio-form-note">
                        {instrumentType === "BOND"
                            ? "İşlem anlık olarak gerçekleştirilecek."
                            : "Hedef fiyata ulaşıldığında işlem otomatik gerçekleştirilir."}
                    </p>
                    {insufficientBalance ? <p className="portfolio-form-note warning">Bu işlem için bakiyeniz yetersiz.</p> : null}
                    {missingConversion ? <p className="portfolio-form-note warning">Bu işlem için güncel döviz dönüşüm kuru bulunamadı.</p> : null}

                    {localError || serverError ? <div className="portfolio-inline-error">{localError ?? serverError}</div> : null}

                    <div className="portfolio-modal-actions">
                        <button type="button" className="portfolio-secondary-btn" onClick={onClose}>İptal</button>
                        <button type="submit" className="portfolio-primary-btn" disabled={busy || optionsLoading || insufficientBalance || missingConversion}>
                            {busy ? "Gönderiliyor..." : "İşlem Talebi Gönder"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export function PortfolioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token, currentUser, refreshCurrentUser } = useAuth();
    const { showToast } = useToast();
    const portfolioId = Number(id);
    const validPortfolioId = Number.isFinite(portfolioId) && portfolioId > 0 ? portfolioId : null;

    const [detailReloadToken, setDetailReloadToken] = useState(0);
    const [detailState, setDetailState] = useState<DetailState>({ loading: false, error: null, data: null });
    const [tradeHistoryState, setTradeHistoryState] = useState<TradeHistoryState>({ loading: false, error: null, page: null });
    const [tradeStatus, setTradeStatus] = useState<TransactionStatus | "">("");
    const [tradePage, setTradePage] = useState(0);
    const [tradeReloadToken, setTradeReloadToken] = useState(0);
    const [formState, setFormState] = useState<PortfolioFormState | null>(null);
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PortfolioResponse | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [tradeModalOpen, setTradeModalOpen] = useState(false);
    const [tradeBusy, setTradeBusy] = useState(false);
    const [tradeError, setTradeError] = useState<string | null>(null);
    const [cancelingTradeId, setCancelingTradeId] = useState<number | null>(null);

    useEffect(() => {
        if (!validPortfolioId) {
            setDetailState({ loading: false, error: "Geçersiz portföy ID.", data: null });
            return undefined;
        }

        let active = true;
        setDetailState((current) => ({ ...current, loading: true, error: null }));

        fetchPortfolio(validPortfolioId)
            .then((data) => {
                if (!active) return;
                setDetailState({ loading: false, error: null, data });
            })
            .catch((caughtError) => {
                if (!active) return;
                setDetailState({
                    loading: false,
                    error: resolveApiError(caughtError, "Portföy detayı yüklenemedi."),
                    data: null,
                });
            });

        return () => {
            active = false;
        };
    }, [detailReloadToken, validPortfolioId]);

    useEffect(() => {
        if (!validPortfolioId) {
            setTradeHistoryState({ loading: false, error: null, page: null });
            return undefined;
        }

        let active = true;
        setTradeHistoryState((current) => ({ ...current, loading: true, error: null }));

        fetchPortfolioTrades(validPortfolioId, { status: tradeStatus, page: tradePage, size: TRADE_PAGE_SIZE })
            .then((page) => {
                if (!active) return;
                setTradeHistoryState({ loading: false, error: null, page });
            })
            .catch((caughtError) => {
                if (!active) return;
                setTradeHistoryState({
                    loading: false,
                    error: resolveApiError(caughtError, "İşlem geçmişi yüklenemedi."),
                    page: null,
                });
            });

        return () => {
            active = false;
        };
    }, [tradePage, tradeReloadToken, tradeStatus, validPortfolioId]);

    const refreshPortfolio = useCallback((changedPortfolioId?: number) => {
        if (!validPortfolioId || (changedPortfolioId && changedPortfolioId !== validPortfolioId)) return;
        setDetailReloadToken((value) => value + 1);
        setTradeReloadToken((value) => value + 1);
    }, [validPortfolioId]);

    const resolveTradeLabel = useCallback((trade: TradeResponse) => {
        const item = detailState.data?.items.find(
            (portfolioItem) => portfolioItem.instrumentType === trade.instrumentType && portfolioItem.instrumentId === trade.instrumentId,
        );
        return trade.instrumentSymbol || item?.instrumentSymbol || `${INSTRUMENT_LABELS[trade.instrumentType]} #${trade.instrumentId}`;
    }, [detailState.data?.items]);

    useTradeNotifications({
        token,
        activePortfolioId: validPortfolioId,
        onPortfolioSignal: refreshPortfolio,
        onBalanceSignal: refreshCurrentUser,
        resolveTradeLabel,
    });

    const submitPortfolioForm = async (payload: CreatePortfolioRequest) => {
        if (!formState?.portfolio) return;
        setFormBusy(true);
        setFormError(null);

        try {
            await updatePortfolio(formState.portfolio.id, { name: payload.name });
            showToast("Portföy güncellendi.", "success");
            setFormState(null);
            refreshPortfolio(formState.portfolio.id);
        } catch (caughtError) {
            setFormError(resolveApiError(caughtError, "Portföy kaydedilemedi."));
        } finally {
            setFormBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        setDeleteError(null);

        try {
            await deletePortfolio(deleteTarget.id);
            showToast("Portföy silindi.", "success");
            setDeleteTarget(null);
            navigate("/portfolios");
        } catch (caughtError) {
            const message =
                caughtError instanceof ApiError && caughtError.status === 409
                    ? "Bu portföyde pozisyon veya bekleyen emir var. Önce pozisyonları kapatman ve bekleyen emirleri iptal etmen gerekir."
                    : resolveApiError(caughtError, "Portföy silinemedi.");
            setDeleteError(message);
        } finally {
            setDeleteBusy(false);
        }
    };

    const submitNewTrade = async (payload: TradeRequest) => {
        if (!validPortfolioId) return;
        setTradeBusy(true);
        setTradeError(null);

        try {
            const response = await submitTrade(validPortfolioId, payload);
            setTradeModalOpen(false);
            showToast(
                response.status === "APPROVED"
                    ? "İşlem onaylandı."
                    : "İşlem talebi alındı, bakiye bloke edildi.",
                "success",
            );
            void refreshCurrentUser();
            refreshPortfolio(validPortfolioId);
        } catch (caughtError) {
            setTradeError(resolveApiError(caughtError, "İşlem talebi gönderilemedi."));
        } finally {
            setTradeBusy(false);
        }
    };

    const handleCancelTrade = async (trade: TradeResponse) => {
        if (!validPortfolioId) return;
        setCancelingTradeId(trade.id);

        try {
            await cancelTrade(validPortfolioId, trade.id);
            showToast("İşlem iptal edildi.", "info");
            void refreshCurrentUser();
            refreshPortfolio(validPortfolioId);
        } catch (caughtError) {
            showToast(resolveApiError(caughtError, "İşlem iptal edilemedi."), "error");
        } finally {
            setCancelingTradeId(null);
        }
    };

    const selectedPortfolio = detailState.data;

    return (
        <KapitalShell activePage="portfolios" showCategories={false}>
            <div className="portfolio-page">
                <div className="portfolio-layout">
                    <PortfolioDetailPageContent
                        state={detailState}
                        trades={tradeHistoryState}
                        tradeStatus={tradeStatus}
                        cancelingTradeId={cancelingTradeId}
                        currentBalance={currentUser?.balance ?? null}
                        onBack={() => navigate("/portfolios")}
                        onEdit={(portfolio) => {
                            setFormError(null);
                            setFormState({ mode: "edit", portfolio });
                        }}
                        onDelete={(portfolio) => {
                            setDeleteError(null);
                            setDeleteTarget(portfolio);
                        }}
                        onNewTrade={() => {
                            setTradeError(null);
                            setTradeModalOpen(true);
                        }}
                        onStatusChange={(status) => {
                            setTradeStatus(status);
                            setTradePage(0);
                        }}
                        onTradePageChange={setTradePage}
                        onCancelTrade={handleCancelTrade}
                    />
                </div>
            </div>

            {formState ? (
                <PortfolioFormModal
                    state={formState}
                    busy={formBusy}
                    error={formError}
                    onClose={() => setFormState(null)}
                    onSubmit={submitPortfolioForm}
                />
            ) : null}

            {deleteTarget ? (
                <DeletePortfolioConfirm
                    portfolio={deleteTarget}
                    busy={deleteBusy}
                    error={deleteError}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                    onOpenDetail={() => setDeleteTarget(null)}
                />
            ) : null}

            {tradeModalOpen && selectedPortfolio ? (
                <NewTradeModal
                    portfolio={selectedPortfolio}
                    currentBalance={currentUser?.balance ?? null}
                    busy={tradeBusy}
                    serverError={tradeError}
                    onClose={() => setTradeModalOpen(false)}
                    onSubmit={submitNewTrade}
                />
            ) : null}
        </KapitalShell>
    );
}

export default function PortfolioDashboardPage() {
    const navigate = useNavigate();
    const { token, refreshCurrentUser } = useAuth();
    const { showToast } = useToast();
    const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([]);
    const [listState, setListState] = useState<PortfolioLoadState>({ loading: true, error: null });
    const [reloadToken, setReloadToken] = useState(0);
    const [formState, setFormState] = useState<PortfolioFormState | null>(null);
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PortfolioResponse | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setListState({ loading: true, error: null });

        fetchPortfolios()
            .then(async (data) => {
                if (!active) return;
                const detailResults = await Promise.allSettled(data.map((portfolio) => fetchPortfolio(portfolio.id)));
                if (!active) return;

                const detailsById = new Map<number, PortfolioResponse>();
                detailResults.forEach((result) => {
                    if (result.status === "fulfilled") {
                        detailsById.set(result.value.id, result.value);
                    }
                });

                setPortfolios(data.map((portfolio) => detailsById.get(portfolio.id) ?? portfolio));
                setListState({ loading: false, error: null });
            })
            .catch((caughtError) => {
                if (!active) return;
                setListState({ loading: false, error: resolveApiError(caughtError, "Portföyler yüklenemedi.") });
            });

        return () => {
            active = false;
        };
    }, [reloadToken]);

    const refreshPortfolio = useCallback((portfolioId?: number) => {
        void portfolioId;
        setReloadToken((value) => value + 1);
    }, []);

    useTradeNotifications({
        token,
        activePortfolioId: null,
        onPortfolioSignal: refreshPortfolio,
        onBalanceSignal: refreshCurrentUser,
    });

    const submitPortfolioForm = async (payload: CreatePortfolioRequest) => {
        if (!formState) return;
        setFormBusy(true);
        setFormError(null);

        try {
            if (formState.mode === "create") {
                const created = await createPortfolio(payload);
                showToast("Portföy oluşturuldu.", "success");
                navigate(`/portfolios/${created.id}`);
            } else if (formState.portfolio) {
                await updatePortfolio(formState.portfolio.id, { name: payload.name });
                showToast("Portföy güncellendi.", "success");
            }

            setFormState(null);
            refreshPortfolio(formState.portfolio?.id);
        } catch (caughtError) {
            setFormError(resolveApiError(caughtError, "Portföy kaydedilemedi."));
        } finally {
            setFormBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        setDeleteError(null);

        try {
            await deletePortfolio(deleteTarget.id);
            showToast("Portföy silindi.", "success");
            setDeleteTarget(null);
            setReloadToken((value) => value + 1);
        } catch (caughtError) {
            const message =
                caughtError instanceof ApiError && caughtError.status === 409
                    ? "Bu portföyde pozisyon veya bekleyen emir var. Önce pozisyonları kapatman ve bekleyen emirleri iptal etmen gerekir."
                    : resolveApiError(caughtError, "Portföy silinemedi.");
            setDeleteError(message);
        } finally {
            setDeleteBusy(false);
        }
    };

    const isEmpty = !listState.loading && !listState.error && portfolios.length === 0;

    return (
        <KapitalShell activePage="portfolios" showCategories={false}>
            <div className="portfolio-page">
                <div className="portfolio-layout">
                    <section className="portfolio-hero">
                        <div>
                            <span className="portfolio-kicker">Kişisel Yatırım Merkezi</span>
                            <h1>Portföylerim</h1>
                            <p>Limit emirlerini, pozisyon dağılımını ve gerçekleşen işlemleri tek panelden yönetin.</p>
                        </div>
                        <button type="button" className="portfolio-primary-btn hero" onClick={() => { setFormError(null); setFormState({ mode: "create" }); }}>
                            <span aria-hidden="true">+</span> Yeni Portföy
                        </button>
                    </section>

                    {listState.error ? (
                        <div className="portfolio-status-card error">
                            <div>
                                <strong>Portföyler yüklenemedi.</strong>
                                <span>{listState.error}</span>
                            </div>
                            <button type="button" onClick={() => setReloadToken((value) => value + 1)}>Tekrar dene</button>
                        </div>
                    ) : null}

                    {listState.loading ? (
                        <section className="portfolio-grid">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <article key={index} className="portfolio-card skeleton">
                                    <div className="portfolio-skeleton-line short" />
                                    <div className="portfolio-skeleton-line large" />
                                    <div className="portfolio-skeleton-line medium" />
                                </article>
                            ))}
                        </section>
                    ) : null}

                    {isEmpty ? (
                        <section className="portfolio-empty-state">
                            <span className="portfolio-empty-icon">◌</span>
                            <h2>Henüz portföyün yok.</h2>
                            <p>İlk portföyünü oluştur, sanal bakiyeni takip et ve fiyat eşleşmesiyle otomatik trade akışını başlat.</p>
                            <button type="button" className="portfolio-primary-btn" onClick={() => { setFormError(null); setFormState({ mode: "create" }); }}>
                                İlk Portföyü Oluştur
                            </button>
                        </section>
                    ) : null}

                    {!listState.loading && portfolios.length > 0 ? (
                        <section className="portfolio-grid">
                            {portfolios.map((portfolio) => (
                                <PortfolioCard
                                    key={portfolio.id}
                                    portfolio={portfolio}
                                    onOpen={() => navigate(`/portfolios/${portfolio.id}`)}
                                    onEdit={() => {
                                        setFormError(null);
                                        setFormState({ mode: "edit", portfolio });
                                    }}
                                    onDelete={() => {
                                        setDeleteError(null);
                                        setDeleteTarget(portfolio);
                                    }}
                                />
                            ))}
                        </section>
                    ) : null}
                </div>
            </div>

            {formState ? (
                <PortfolioFormModal
                    state={formState}
                    busy={formBusy}
                    error={formError}
                    onClose={() => setFormState(null)}
                    onSubmit={submitPortfolioForm}
                />
            ) : null}

            {deleteTarget ? (
                <DeletePortfolioConfirm
                    portfolio={deleteTarget}
                    busy={deleteBusy}
                    error={deleteError}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                    onOpenDetail={() => {
                        navigate(`/portfolios/${deleteTarget.id}`);
                        setDeleteTarget(null);
                    }}
                />
            ) : null}
        </KapitalShell>
    );
}
