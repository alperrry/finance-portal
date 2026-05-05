import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { fetchInstrumentHistory, type HistoryPoint, type HistoryResponse, type InstrumentType } from "../api/history";
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
import { fetchGoogleNewsRss, type GoogleNewsItem } from "../api/news";
import { KapitalShell } from "../components/layout";
import "./InstrumentDetailPage.css";

type RangeKey = "1A" | "3A" | "6A" | "1Y";

type RequestState<T> = {
    resolvedKey: string;
    data: T | null;
    error: string | null;
};

type ChartSeries = {
    key: string;
    label: string;
    color: string;
    values: Array<number | null>;
};

type InstrumentSummary = {
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

type MetricCard = {
    label: string;
    value: string;
    note: string;
};

type LineChartProps = {
    dates: string[];
    series: ChartSeries[];
    emptyLabel: string;
    yFormatter?: (value: number) => string;
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; months?: number; days?: number }> = [
    { key: "1A", label: "1A", months: 1 },
    { key: "3A", label: "3A", months: 3 },
    { key: "6A", label: "6A", months: 6 },
    { key: "1Y", label: "1Y", days: 365 },
];

const DEFAULT_RANGE: RangeKey = "6A";

const CHART_COLORS = {
    price: "#111111",
    accent: "#c1622f",
    success: "#5bb870",
    danger: "#e05858",
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
});

const parseType = (value: string | undefined): InstrumentType | null =>
    value === "stocks" || value === "fx" || value === "funds" || value === "bonds" ? value : null;

const parseRange = (value: string | null): RangeKey =>
    value === "1A" || value === "3A" || value === "6A" || value === "1Y" ? value : DEFAULT_RANGE;

const toSafeNumber = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const formatDecimal = (value: number | null | undefined, digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
};

const formatPercent = (value: number | null | undefined, digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatDecimal(normalized, digits)}%`;
};

const formatCompactNumber = (value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const absolute = Math.abs(normalized);
    if (absolute >= 1_000_000_000) return `${formatDecimal(normalized / 1_000_000_000, 1)} Mr`;
    if (absolute >= 1_000_000) return `${formatDecimal(normalized / 1_000_000, 1)} Mn`;
    if (absolute >= 1_000) return `${formatDecimal(normalized / 1_000, 1)} Bin`;

    return new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: 0,
    }).format(normalized);
};

const formatLocalDate = (value: string | null | undefined) => {
    if (!value) return "-";

    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "-";
    return dateFormatter.format(date);
};

const formatShortDate = (value: string | null | undefined) => {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return shortDateFormatter.format(date);
};

const formatCurrencyValue = (value: number | null | undefined, currency = "TRY", digits = 2) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const formatted = formatDecimal(normalized, digits);
    if (currency === "TRY") return `₺${formatted}`;
    if (currency === "USD") return `$${formatted}`;
    if (currency === "EUR") return `€${formatted}`;
    return `${formatted} ${currency}`;
};

const getValueDigits = (type: InstrumentType, value: number | null | undefined) => {
    const normalized = toSafeNumber(value);
    if (normalized === null) return type === "funds" ? 4 : 2;

    if (type === "fx") {
        return Math.abs(normalized) >= 10 ? 4 : 5;
    }

    if (type === "funds") {
        return 4;
    }

    return 2;
};

const formatValueByType = (type: InstrumentType, value: number | null | undefined, currency?: string | null) => {
    const digits = getValueDigits(type, value);

    if (type === "stocks") {
        return formatCurrencyValue(value, currency ?? "TRY", digits);
    }

    if (type === "funds") {
        return formatCurrencyValue(value, "TRY", digits);
    }

    if (type === "bonds") {
        return value === null || value === undefined ? "-" : `%${formatDecimal(value, digits)}`;
    }

    return formatDecimal(value, digits);
};

const subtractMonths = (date: Date, months: number) => {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() - months);

    const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, maxDay));
    return result;
};

const subtractDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
};

const toIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getRangeDates = (range: RangeKey, today: Date) => {
    const config = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[2];
    const to = new Date(today);
    const from = config.months ? subtractMonths(to, config.months) : subtractDays(to, config.days ?? 365);

    return {
        from: toIsoDate(from),
        to: toIsoDate(to),
    };
};

const getTickIndexes = (length: number, tickCount: number) => {
    if (length <= 0) return [];
    if (length === 1) return [0];

    const indexes = new Set<number>();
    for (let index = 0; index < tickCount; index += 1) {
        indexes.add(Math.round((index / (tickCount - 1)) * (length - 1)));
    }

    return Array.from(indexes).sort((left, right) => left - right);
};

const getLinearTicks = (minimum: number, maximum: number, count: number) => {
    if (count <= 1) return [minimum];
    if (minimum === maximum) return [minimum];

    return Array.from({ length: count }, (_, index) => maximum - ((maximum - minimum) * index) / (count - 1));
};

const createLinePath = (values: Array<number | null>, xAt: (index: number) => number, yAt: (value: number) => number) => {
    let path = "";
    let openSegment = false;

    values.forEach((value, index) => {
        if (value === null) {
            openSegment = false;
            return;
        }

        const command = openSegment ? "L" : "M";
        path += `${command}${xAt(index).toFixed(2)},${yAt(value).toFixed(2)} `;
        openSegment = true;
    });

    return path.trim();
};

const getLastClose = (points: HistoryPoint[]) => [...points].reverse().find((point) => toSafeNumber(point.close) !== null)?.close ?? null;

const getDisplayLatestValue = (summary: InstrumentSummary, latestClose: number | null) =>
    summary.type === "stocks" ? summary.latestValue : latestClose ?? summary.latestValue;

const getDisplayLatestNote = (summary: InstrumentSummary, latestClose: number | null, historyTo: string | null | undefined) =>
    summary.type === "stocks"
        ? `${formatLocalDate(summary.latestDate)} piyasa fiyatı`
        : latestClose !== null
          ? `${formatLocalDate(historyTo)}`
          : summary.helper;

const getFirstClose = (points: HistoryPoint[]) => points.find((point) => toSafeNumber(point.close) !== null)?.close ?? null;

const calculatePeriodChange = (points: HistoryPoint[]) => {
    const first = getFirstClose(points);
    const last = getLastClose(points);

    if (first === null || last === null || first === 0) {
        return null;
    }

    return ((last - first) / first) * 100;
};

const getSeriesHigh = (points: HistoryPoint[]) => {
    const values = points
        .map((point) => toSafeNumber(point.high) ?? toSafeNumber(point.close))
        .filter((value): value is number => value !== null);

    return values.length > 0 ? Math.max(...values) : null;
};

const getSeriesLow = (points: HistoryPoint[]) => {
    const values = points
        .map((point) => toSafeNumber(point.low) ?? toSafeNumber(point.close))
        .filter((value): value is number => value !== null);

    return values.length > 0 ? Math.min(...values) : null;
};

const getLastVolume = (points: HistoryPoint[]) =>
    [...points].reverse().find((point) => toSafeNumber(point.volume) !== null)?.volume ?? null;

const stripMarketSuffix = (code: string) => code.replace(/\.IS$/i, "").trim();

const normalizeNameForQuery = (value: string) =>
    value
        .replace(/\bT\.?A\.?S\.?\b/gi, "")
        .replace(/\bA\.?S\.?\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

const buildNewsQuery = (instrument: InstrumentSummary) => {
    switch (instrument.type) {
        case "stocks": {
            const code = stripMarketSuffix(instrument.code);
            const normalizedName = normalizeNameForQuery(instrument.title).split(" ").slice(0, 3).join(" ");
            return normalizedName && normalizedName.toLocaleLowerCase("tr-TR") !== code.toLocaleLowerCase("tr-TR")
                ? `${code} OR "${normalizedName}"`
                : code;
        }
        case "fx":
            return `${instrument.code} kuru`;
        case "funds":
            return `${instrument.code} fon`;
        case "bonds":
            return instrument.code;
    }
};

const buildStockSummary = (row: StockResponse, code: string): InstrumentSummary => ({
    type: "stocks",
    code,
    title: row.longName ?? row.shortName ?? code,
    subtitle: row.shortName && row.longName && row.shortName !== row.longName ? row.shortName : row.sector ?? row.indexName ?? "Hisse",
    helper: "Gün içi fiyat snapshot'tan, grafik ise tarihsel kapanış serisinden gelir.",
    currency: row.currency ?? "TRY",
    latestValue: row.price,
    latestDate: row.tradeDate,
    snapshotChange: row.changePercent,
    newsQuery: stripMarketSuffix(code),
    stats: [
        { label: "Açılış", value: formatCurrencyValue(row.open, row.currency ?? "TRY") },
        { label: "Gün İçi Yüksek", value: formatCurrencyValue(row.dayHigh, row.currency ?? "TRY") },
        { label: "Gün İçi Düşük", value: formatCurrencyValue(row.dayLow, row.currency ?? "TRY") },
        { label: "Hacim", value: formatCompactNumber(row.volume) },
    ],
});

const buildFxSummary = (row: FxResponse, code: string): InstrumentSummary => ({
    type: "fx",
    code,
    title: row.currencyName,
    subtitle: `${row.unit > 1 ? row.unit : 1} birim / TRY`,
    helper: "Grafik, TCMB tarihsel kur serisini kullanır.",
    currency: null,
    latestValue: row.forexSelling ?? row.forexBuying,
    latestDate: row.rateDate,
    snapshotChange: null,
    newsQuery: `${code} kuru`,
    stats: [
        { label: "Alış", value: formatDecimal(row.forexBuying, getValueDigits("fx", row.forexBuying)) },
        { label: "Satış", value: formatDecimal(row.forexSelling, getValueDigits("fx", row.forexSelling)) },
        {
            label: "Makas",
            value:
                toSafeNumber(row.forexBuying) !== null && toSafeNumber(row.forexSelling) !== null
                    ? formatDecimal((row.forexSelling ?? 0) - (row.forexBuying ?? 0), getValueDigits("fx", row.forexSelling))
                    : "-",
        },
        { label: "Tarih", value: formatLocalDate(row.rateDate) },
    ],
});

const buildFundSummary = (row: FundResponse, code: string): InstrumentSummary => ({
    type: "funds",
    code,
    title: row.name,
    subtitle: row.fundType ?? "Yatırım Fonu",
    helper: "Grafik, TEFAS fiyat serisinden üretilir.",
    currency: "TRY",
    latestValue: row.price,
    latestDate: row.priceDate,
    snapshotChange: null,
    newsQuery: `${code} fon`,
    stats: [
        { label: "Yatırımcı", value: formatCompactNumber(row.investorCount) },
        { label: "Portföy", value: formatCurrencyValue(row.portfolioSize, "TRY") },
        { label: "Pay Adedi", value: formatCompactNumber(row.totalShares) },
        { label: "Tarih", value: formatLocalDate(row.priceDate) },
    ],
});

const buildBondSummary = (row: BondResponse, code: string): InstrumentSummary => ({
    type: "bonds",
    code,
    title: row.name,
    subtitle: row.bondType ?? row.currency ?? "Tahvil/Bono",
    helper: "Grafik, EVDS faiz serisinden üretilir.",
    currency: null,
    latestValue: row.compoundedRate ?? row.interestRate,
    latestDate: row.rateDate,
    snapshotChange: null,
    newsQuery: code,
    stats: [
        { label: "Faiz", value: row.interestRate === null ? "-" : `%${formatDecimal(row.interestRate, 2)}` },
        { label: "Bileşik", value: row.compoundedRate === null ? "-" : `%${formatDecimal(row.compoundedRate, 2)}` },
        { label: "Vade", value: row.maturityDays === null ? "-" : `${formatCompactNumber(row.maturityDays)} gün` },
        { label: "Tarih", value: formatLocalDate(row.rateDate) },
    ],
});

async function fetchInstrumentSummary(type: InstrumentType, code: string): Promise<InstrumentSummary> {
    switch (type) {
        case "stocks": {
            const rows = await fetchStocks();
            const match = rows.find((row) => row.symbol === code);
            return match
                ? buildStockSummary(match, code)
                : {
                      type,
                      code,
                      title: code,
                      subtitle: "Hisse",
                      helper: "Hisse detayları bulunamadı, grafik tarihsel seriden çiziliyor.",
                      currency: "TRY",
                      latestValue: null,
                      latestDate: null,
                      snapshotChange: null,
                      newsQuery: stripMarketSuffix(code),
                      stats: [],
                  };
        }
        case "fx": {
            const rows = await fetchFx();
            const match = rows.find((row) => row.currencyCode === code);
            return match
                ? buildFxSummary(match, code)
                : {
                      type,
                      code,
                      title: code,
                      subtitle: "Döviz",
                      helper: "Döviz detayları bulunamadı, grafik tarihsel seriden çiziliyor.",
                      currency: null,
                      latestValue: null,
                      latestDate: null,
                      snapshotChange: null,
                      newsQuery: `${code} kuru`,
                      stats: [],
                  };
        }
        case "funds": {
            const rows = await fetchFunds();
            const match = rows.find((row) => row.code === code);
            return match
                ? buildFundSummary(match, code)
                : {
                      type,
                      code,
                      title: code,
                      subtitle: "Fon",
                      helper: "Fon detayları bulunamadı, grafik tarihsel seriden çiziliyor.",
                      currency: "TRY",
                      latestValue: null,
                      latestDate: null,
                      snapshotChange: null,
                      newsQuery: `${code} fon`,
                      stats: [],
                  };
        }
        case "bonds": {
            const rows = await fetchBonds();
            const match = rows.find((row) => row.evdsSeriesCode === code);
            return match
                ? buildBondSummary(match, code)
                : {
                      type,
                      code,
                      title: code,
                      subtitle: "Tahvil/Bono",
                      helper: "Tahvil detayları bulunamadı, grafik tarihsel seriden çiziliyor.",
                      currency: null,
                      latestValue: null,
                      latestDate: null,
                      snapshotChange: null,
                      newsQuery: code,
                      stats: [],
                  };
        }
    }
}

function LineChart({ dates, series, emptyLabel, yFormatter }: LineChartProps) {
    const width = 960;
    const height = 340;
    const padding = { top: 20, right: 18, bottom: 34, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const values = series.flatMap((item) => item.values).filter((value): value is number => value !== null);

    if (values.length === 0) {
        return (
            <div className="detail-chart-empty">
                <strong>Grafik hazır değil</strong>
                <span>{emptyLabel}</span>
            </div>
        );
    }

    let minimum = Math.min(...values);
    let maximum = Math.max(...values);

    const span = maximum - minimum;
    const paddingValue = span === 0 ? Math.max(Math.abs(maximum) * 0.08, 1) : span * 0.12;
    minimum -= paddingValue;
    maximum += paddingValue;

    if (minimum === maximum) {
        minimum -= 1;
        maximum += 1;
    }

    const xAt = (index: number) => padding.left + (index / Math.max(dates.length - 1, 1)) * innerWidth;
    const yAt = (value: number) => padding.top + ((maximum - value) / (maximum - minimum)) * innerHeight;

    const xTicks = getTickIndexes(dates.length, Math.min(5, dates.length));
    const yTicks = getLinearTicks(minimum, maximum, 5);

    return (
        <div className="detail-chart-frame">
            <svg className="detail-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
                <defs>
                    <linearGradient id="detail-grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(17,17,17,0.16)" />
                        <stop offset="100%" stopColor="rgba(17,17,17,0.04)" />
                    </linearGradient>
                </defs>

                <rect
                    x={padding.left}
                    y={padding.top}
                    width={innerWidth}
                    height={innerHeight}
                    rx="18"
                    fill="rgba(255,255,255,0.74)"
                />

                {yTicks.map((tick) => (
                    <g key={`y-${tick.toFixed(4)}`}>
                        <line
                            x1={padding.left}
                            y1={yAt(tick)}
                            x2={width - padding.right}
                            y2={yAt(tick)}
                            stroke="url(#detail-grid-fade)"
                            strokeWidth="1"
                        />
                        <text className="detail-chart-axis" x={padding.left - 10} y={yAt(tick) + 4} textAnchor="end">
                            {yFormatter ? yFormatter(tick) : formatDecimal(tick, 2)}
                        </text>
                    </g>
                ))}

                {series.map((item) => {
                    const path = createLinePath(item.values, xAt, yAt);
                    if (!path) {
                        return null;
                    }

                    return (
                        <path
                            key={item.key}
                            d={path}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="2.6"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    );
                })}

                {xTicks.map((tickIndex) => (
                    <text
                        key={`x-${tickIndex}`}
                        className="detail-chart-axis"
                        x={xAt(tickIndex)}
                        y={height - 10}
                        textAnchor={tickIndex === 0 ? "start" : tickIndex === dates.length - 1 ? "end" : "middle"}
                    >
                        {formatShortDate(dates[tickIndex])}
                    </text>
                ))}
            </svg>
        </div>
    );
}

export default function InstrumentDetailPage() {
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const instrumentType = parseType(params.type);
    const code = decodeURIComponent(params.code ?? "").trim();
    const range = parseRange(searchParams.get("range"));

    const [summaryState, setSummaryState] = useState<RequestState<InstrumentSummary>>({
        resolvedKey: "",
        data: null,
        error: null,
    });
    const [historyState, setHistoryState] = useState<RequestState<HistoryResponse>>({
        resolvedKey: "",
        data: null,
        error: null,
    });
    const [newsState, setNewsState] = useState<RequestState<GoogleNewsItem[]>>({
        resolvedKey: "",
        data: null,
        error: null,
    });

    const today = useMemo(() => new Date(), []);
    const rangeDates = useMemo(() => getRangeDates(range, today), [range, today]);
    const summaryRequestKey = instrumentType && code ? `${instrumentType}:${code}` : "invalid";
    const historyRequestKey = `${summaryRequestKey}:${range}:${rangeDates.from}:${rangeDates.to}`;
    const newsRequestKey = `${summaryRequestKey}:news`;

    useEffect(() => {
        if (!instrumentType || !code) {
            return;
        }

        let active = true;

        fetchInstrumentSummary(instrumentType, code)
            .then((data) => {
                if (!active) return;
                setSummaryState({
                    resolvedKey: summaryRequestKey,
                    data,
                    error: null,
                });
            })
            .catch((error: Error) => {
                if (!active) return;
                setSummaryState({
                    resolvedKey: summaryRequestKey,
                    data: null,
                    error: error.message || "Enstrüman detayı yüklenemedi.",
                });
            });

        return () => {
            active = false;
        };
    }, [code, instrumentType, summaryRequestKey]);

    useEffect(() => {
        if (!instrumentType || !code) {
            return;
        }

        let active = true;

        fetchInstrumentHistory(instrumentType, code, rangeDates.from, rangeDates.to)
            .then((data) => {
                if (!active) return;
                setHistoryState({
                    resolvedKey: historyRequestKey,
                    data,
                    error: null,
                });
            })
            .catch((error: Error) => {
                if (!active) return;
                setHistoryState({
                    resolvedKey: historyRequestKey,
                    data: null,
                    error: error.message || "Tarihsel veri yüklenemedi.",
                });
            });

        return () => {
            active = false;
        };
    }, [code, historyRequestKey, instrumentType, rangeDates.from, rangeDates.to]);

    useEffect(() => {
        const summary = summaryState.resolvedKey === summaryRequestKey ? summaryState.data : null;
        if (!summary) {
            return;
        }

        let active = true;

        fetchGoogleNewsRss(buildNewsQuery(summary), { limit: 8 })
            .then((data) => {
                if (!active) return;
                setNewsState({
                    resolvedKey: newsRequestKey,
                    data,
                    error: null,
                });
            })
            .catch((error: Error) => {
                if (!active) return;
                setNewsState({
                    resolvedKey: newsRequestKey,
                    data: null,
                    error: error.message || "Enstrümana özel haberler yüklenemedi.",
                });
            });

        return () => {
            active = false;
        };
    }, [newsRequestKey, summaryRequestKey, summaryState.data, summaryState.resolvedKey]);

    const summary = summaryState.resolvedKey === summaryRequestKey ? summaryState.data : null;
    const summaryError = summaryState.resolvedKey === summaryRequestKey ? summaryState.error : null;
    const history = historyState.resolvedKey === historyRequestKey ? historyState.data : null;
    const historyError = historyState.resolvedKey === historyRequestKey ? historyState.error : null;
    const newsItems = newsState.resolvedKey === newsRequestKey ? newsState.data : null;
    const newsError = newsState.resolvedKey === newsRequestKey ? newsState.error : null;

    const loadingSummary = summaryState.resolvedKey !== summaryRequestKey;
    const loadingHistory = historyState.resolvedKey !== historyRequestKey;
    const loadingNews = summary === null || newsState.resolvedKey !== newsRequestKey;

    const historyPoints = useMemo(() => history?.data ?? [], [history]);
    const periodChange = useMemo(() => calculatePeriodChange(historyPoints), [historyPoints]);
    const latestClose = useMemo(() => getLastClose(historyPoints), [historyPoints]);
    const highestValue = useMemo(() => getSeriesHigh(historyPoints), [historyPoints]);
    const lowestValue = useMemo(() => getSeriesLow(historyPoints), [historyPoints]);
    const lastVolume = useMemo(() => getLastVolume(historyPoints), [historyPoints]);

    const chartDates = useMemo(() => historyPoints.map((point) => point.date), [historyPoints]);
    const chartSeries = useMemo<ChartSeries[]>(
        () =>
            summary
                ? [
                      {
                          key: "close",
                          label: "Kapanış",
                          color: CHART_COLORS.price,
                          values: historyPoints.map((point) => toSafeNumber(point.close)),
                      },
                  ]
                : [],
        [historyPoints, summary]
    );

    const metricCards = useMemo<MetricCard[]>(() => {
        if (!summary) return [];

        return [
            {
                label: "Son Değer",
                value: formatValueByType(summary.type, getDisplayLatestValue(summary, latestClose), summary.currency),
                note: getDisplayLatestNote(summary, latestClose, history?.to),
            },
            {
                label: `${range} Değişim`,
                value: formatPercent(periodChange ?? summary.snapshotChange),
                note: `${formatLocalDate(rangeDates.from)} → ${formatLocalDate(rangeDates.to)}`,
            },
            {
                label: "Aralık Yüksek",
                value: formatValueByType(summary.type, highestValue, summary.currency),
                note: "Seçili periyodun tepe noktası",
            },
            {
                label: "Aralık Düşük",
                value: formatValueByType(summary.type, lowestValue, summary.currency),
                note: "Seçili periyodun dip noktası",
            },
            {
                label: summary.type === "stocks" ? "Hacim" : "Son Kayıt",
                value: summary.type === "stocks" ? formatCompactNumber(lastVolume) : formatLocalDate(summary.latestDate),
                note: summary.type === "stocks" ? "Son işlem günündeki hacim" : "Son güncel veri tarihi",
            },
        ];
    }, [history?.to, highestValue, lastVolume, latestClose, lowestValue, periodChange, range, rangeDates.from, rangeDates.to, summary]);

    const changeTone =
        toSafeNumber(periodChange ?? summary?.snapshotChange) === null
            ? ""
            : (periodChange ?? summary?.snapshotChange ?? 0) < 0
              ? "down"
              : "up";

    const updateRange = (nextRange: RangeKey) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("range", nextRange);
        setSearchParams(nextParams, { replace: true });
    };

    if (!instrumentType || !code) {
        return (
            <KapitalShell activePage="portfolio" showCategories={false}>
                <div className="detail-page">
                    <div className="detail-layout">
                        <div className="detail-status-card error">
                            <strong>Geçersiz enstrüman bağlantısı</strong>
                            <span>Liste sayfasından tekrar seçim yap.</span>
                        </div>
                    </div>
                </div>
            </KapitalShell>
        );
    }

    return (
        <KapitalShell activePage="portfolio" showCategories={false}>
            <div className="detail-page">
                <div className="detail-layout">
                    <section className="detail-hero">
                        <div className="detail-hero-copy">
                            <div className="detail-kicker">Enstrüman Detayı</div>
                            <div className="detail-title-row">
                                <div>
                                    <h1 className="detail-title">{summary?.title ?? code}</h1>
                                    <p className="detail-subtitle">
                                        <strong>{code}</strong>
                                        <span>{summary?.subtitle ?? "Enstrüman"}</span>
                                    </p>
                                </div>

                                <div className={`detail-change-chip ${changeTone}`.trim()}>
                                    <strong>{formatPercent(periodChange ?? summary?.snapshotChange)}</strong>
                                    <span>{range} görünümündeki toplam değişim</span>
                                </div>
                            </div>

                            <p className="detail-copy">
                                {summary?.helper ??
                                    "Grafik seçili aralıktaki tarihsel seriyi gösterir. Daha ileri teknik indikatörler için analiz ekranına geçebilirsin."}
                            </p>

                            <div className="detail-actions">
                                <RouterLink className="detail-action secondary" to="/portfolio">
                                    Enstrümanlara Dön
                                </RouterLink>
                                <RouterLink
                                    className="detail-action primary"
                                    to={`/analysis?type=${instrumentType}&code=${encodeURIComponent(code)}&range=${range}`}
                                >
                                    Analize Git
                                </RouterLink>
                            </div>
                        </div>

                        <div className="detail-side-card">
                            <div className="detail-panel-kicker">Canlı Referans</div>
                            <h2 className="detail-side-title">Özet Kartlar</h2>
                            <div className="detail-side-grid">
                                {(summary?.stats ?? []).map((item) => (
                                    <div key={item.label} className="detail-side-stat">
                                        <span>{item.label}</span>
                                        <strong>{item.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {summaryError ? (
                        <div className="detail-status-card error">
                            <strong>Enstrüman detayı alınamadı</strong>
                            <span>{summaryError}</span>
                        </div>
                    ) : null}

                    {loadingSummary ? (
                        <div className="detail-status-card">
                            <strong>Detay kartı hazırlanıyor</strong>
                            <span>Seçili enstrümanın özet alanları yükleniyor.</span>
                        </div>
                    ) : null}

                    {metricCards.length > 0 ? (
                        <section className="detail-metrics">
                            {metricCards.map((metric) => (
                                <article key={metric.label} className="detail-metric-card">
                                    <div className="detail-metric-label">{metric.label}</div>
                                    <div className="detail-metric-value">{metric.value}</div>
                                    <div className="detail-metric-note">{metric.note}</div>
                                </article>
                            ))}
                        </section>
                    ) : null}

                    <section className="detail-panel">
                        <div className="detail-panel-head">
                            <div>
                                <div className="detail-panel-kicker">Tarihsel Grafik</div>
                                <h2 className="detail-panel-title">Kapanış Serisi</h2>
                                <p className="detail-panel-subtitle">
                                    Teknik indikatörler bu ekranda yok. Yalnızca seçili enstrümanın tarihsel fiyat eğrisi gösteriliyor.
                                </p>
                            </div>

                            <div className="detail-range-list">
                                {RANGE_OPTIONS.map((option) => (
                                    <button
                                        key={option.key}
                                        className={`detail-range-pill ${option.key === range ? "active" : ""}`.trim()}
                                        type="button"
                                        onClick={() => updateRange(option.key)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {historyError ? (
                            <div className="detail-status-card error">
                                <strong>Tarihsel seri alınamadı</strong>
                                <span>{historyError}</span>
                            </div>
                        ) : null}

                        {loadingHistory ? (
                            <div className="detail-status-card">
                                <strong>Grafik hazırlanıyor</strong>
                                <span>{range} aralığındaki kapanış verileri yükleniyor.</span>
                            </div>
                        ) : null}

                        <LineChart
                            dates={chartDates}
                            series={chartSeries}
                            emptyLabel="Seçili aralık için çizilecek yeterli kapanış verisi yok."
                            yFormatter={(value) => formatValueByType(instrumentType, value, summary?.currency)}
                        />

                        {summary ? (
                            <div className="detail-series-legend">
                                <div className="detail-legend-item">
                                    <span className="detail-legend-dot" style={{ backgroundColor: CHART_COLORS.price }} />
                                    {summary.title}
                                </div>
                            </div>
                        ) : null}
                    </section>

                    <section className="detail-panel">
                        <div className="detail-panel-head">
                            <div>
                                <div className="detail-panel-kicker">Haber Akışı</div>
                                <h2 className="detail-panel-title">Enstrümana Özel Haberler</h2>
                                <p className="detail-panel-subtitle">
                                    Google News RSS araması üzerinden listelenir. Başlıklar yeni sekmede açılır.
                                </p>
                            </div>

                            {summary ? <div className="detail-query-chip">{buildNewsQuery(summary)}</div> : null}
                        </div>

                        {newsError ? (
                            <div className="detail-status-card error">
                                <strong>Haber akışı alınamadı</strong>
                                <span>{newsError}</span>
                            </div>
                        ) : null}

                        {loadingNews ? (
                            <div className="detail-status-card">
                                <strong>Haberler yükleniyor</strong>
                                <span>Seçili enstrümana göre ilgili başlıklar aranıyor.</span>
                            </div>
                        ) : null}

                        {!loadingNews && !newsError && (newsItems?.length ?? 0) === 0 ? (
                            <div className="detail-chart-empty">
                                <strong>İlgili haber bulunamadı</strong>
                                <span>Arama terimi için Google RSS sonuç dönmedi.</span>
                            </div>
                        ) : null}

                        {newsItems && newsItems.length > 0 ? (
                            <div className="detail-news-grid">
                                {newsItems.map((item) => (
                                    <a
                                        key={`${item.link}-${item.publishedAt ?? "na"}`}
                                        className="detail-news-card"
                                        href={item.link}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <div className="detail-news-meta">
                                            <span>{item.sourceName ?? "Google News"}</span>
                                            <strong>{formatLocalDate(item.publishedAt)}</strong>
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>{item.description || "Başlık, Google News RSS arama sonucundan getirildi."}</p>
                                    </a>
                                ))}
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        </KapitalShell>
    );
}
