import i18n from "../../../i18n";
import type {
    BondResponse,
    FundResponse,
    FxResponse,
    MacroObservationResponse,
    StockResponse,
    ViopContractPriceResponse,
} from "../api/marketApi";
import type { MarketSortState, MarketTab, MarketData, SummaryCard } from "../types";
import {
    toSafeNumber,
    formatNumber,
    formatWholeNumber,
    formatCompactNumber,
    formatCompactMoney,
    formatMoney,
    formatRate,
    formatLocalDate,
    formatUnitLabel,
    formatPercent,
} from "./marketFormatters";

const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });

export const normalizeSearch = (value: string) =>
    value
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c");

export const compareNullableNumbersAsc = (left: number | null | undefined, right: number | null | undefined) => {
    const l = toSafeNumber(left);
    const r = toSafeNumber(right);

    if (l === null && r === null) return 0;
    if (l === null) return 1;
    if (r === null) return -1;

    return l - r;
};

export const compareNullableNumbersDesc = (left: number | null | undefined, right: number | null | undefined) => {
    const l = toSafeNumber(left);
    const r = toSafeNumber(right);

    if (l === null && r === null) return 0;
    if (l === null) return 1;
    if (r === null) return -1;

    return r - l;
};

export const compareNullableStringsAsc = (left: string | null | undefined, right: string | null | undefined) => {
    const l = left?.trim() ?? "";
    const r = right?.trim() ?? "";

    if (!l && !r) return 0;
    if (!l) return 1;
    if (!r) return -1;

    return collator.compare(l, r);
};

const toTimestamp = (value: string | null | undefined): number | null => {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? null : ts;
};

const compareNullableDatesAsc = (left: string | null | undefined, right: string | null | undefined) =>
    compareNullableNumbersAsc(toTimestamp(left), toTimestamp(right));

const applySortDirection = (result: number, direction: "asc" | "desc") => (direction === "asc" ? result : -result);

export const getFxSpread = (item: FxResponse): number | null => {
    const buying = toSafeNumber(item.forexBuying);
    const selling = toSafeNumber(item.forexSelling);

    if (buying === null || selling === null) return null;
    return selling - buying;
};

const latestStringValue = (values: Array<string | null | undefined>) =>
    values.filter((v): v is string => Boolean(v)).sort(collator.compare).at(-1) ?? null;

const compareFxPairAsc = (left: FxResponse, right: FxResponse) => {
    const PRIORITY = ["USD", "EUR", "GBP", "CHF", "SAR", "KWD", "JPY"];
    const li = PRIORITY.indexOf(left.currencyCode);
    const ri = PRIORITY.indexOf(right.currencyCode);

    if (li >= 0 || ri >= 0) {
        if (li < 0) return 1;
        if (ri < 0) return -1;
        return li - ri;
    }

    return collator.compare(left.currencyCode, right.currencyCode);
};

export function sortFxRows(rows: FxResponse[], sortConfig: MarketSortState["fx"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "pair":   result = compareFxPairAsc(l, r); break;
            case "name":   result = compareNullableStringsAsc(l.currencyName, r.currencyName); break;
            case "buying": result = compareNullableNumbersAsc(l.forexBuying, r.forexBuying); break;
            case "selling":result = compareNullableNumbersAsc(l.forexSelling, r.forexSelling); break;
            case "spread": result = compareNullableNumbersAsc(getFxSpread(l), getFxSpread(r)); break;
            case "date":   result = compareNullableDatesAsc(l.rateDate, r.rateDate); break;
            default:       result = compareFxPairAsc(l, r);
        }

        if (result === 0) result = compareFxPairAsc(l, r);
        return applySortDirection(result, sortConfig.direction);
    });
}

export function sortBondRows(rows: BondResponse[], sortConfig: MarketSortState["bonds"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "instrument": result = compareNullableStringsAsc(l.name, r.name); break;
            case "type":       result = compareNullableStringsAsc(l.bondType, r.bondType); break;
            case "maturity":   result = compareNullableNumbersAsc(l.maturityDays, r.maturityDays); break;
            case "interest":   result = compareNullableNumbersAsc(l.interestRate, r.interestRate); break;
            case "compounded": result = compareNullableNumbersAsc(l.compoundedRate, r.compoundedRate); break;
            case "currency":   result = compareNullableStringsAsc(l.currency, r.currency); break;
            case "date":       result = compareNullableDatesAsc(l.rateDate, r.rateDate); break;
            default:           result = compareNullableStringsAsc(l.name, r.name);
        }

        if (result === 0) result = compareNullableStringsAsc(l.name, r.name);
        return applySortDirection(result, sortConfig.direction);
    });
}

export function sortFundRows(rows: FundResponse[], sortConfig: MarketSortState["funds"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "fund":          result = compareNullableStringsAsc(l.code, r.code); break;
            case "type":          result = compareNullableStringsAsc(l.fundType, r.fundType); break;
            case "price":         result = compareNullableNumbersAsc(l.price, r.price); break;
            case "investors":     result = compareNullableNumbersAsc(l.investorCount, r.investorCount); break;
            case "portfolioSize": result = compareNullableNumbersAsc(l.portfolioSize, r.portfolioSize); break;
            case "shares":        result = compareNullableNumbersAsc(l.totalShares, r.totalShares); break;
            case "date":          result = compareNullableDatesAsc(l.priceDate, r.priceDate); break;
            default:              result = compareNullableStringsAsc(l.code, r.code);
        }

        if (result === 0) result = compareNullableStringsAsc(l.code, r.code);
        return applySortDirection(result, sortConfig.direction);
    });
}

function getStockRangeWidth(row: StockResponse): number | null {
    const high = toSafeNumber(row.fiftyTwoWeekHigh);
    const low = toSafeNumber(row.fiftyTwoWeekLow);

    if (high === null || low === null) return null;
    return high - low;
}

export function sortStockRows(rows: StockResponse[], sortConfig: MarketSortState["stocks"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "stock":     result = compareNullableStringsAsc(l.symbol, r.symbol); break;
            case "sector":    result = compareNullableStringsAsc(l.sector ?? l.indexName, r.sector ?? r.indexName); break;
            case "price":     result = compareNullableNumbersAsc(l.price, r.price); break;
            case "change":
                result = compareNullableNumbersAsc(l.changePercent, r.changePercent);
                if (result === 0) result = compareNullableNumbersAsc(l.change, r.change);
                break;
            case "volume":    result = compareNullableNumbersAsc(l.volume, r.volume); break;
            case "marketCap": result = compareNullableNumbersAsc(l.marketCap, r.marketCap); break;
            case "range52w":  result = compareNullableNumbersAsc(getStockRangeWidth(l), getStockRangeWidth(r)); break;
            case "fetchedAt":
                result = compareNullableDatesAsc(l.fetchedAt, r.fetchedAt);
                if (result === 0) result = compareNullableDatesAsc(l.tradeDate, r.tradeDate);
                break;
            default:          result = compareNullableStringsAsc(l.symbol, r.symbol);
        }

        if (result === 0) result = compareNullableStringsAsc(l.symbol, r.symbol);
        return applySortDirection(result, sortConfig.direction);
    });
}

export function sortMacroRows(rows: MacroObservationResponse[], sortConfig: MarketSortState["macro"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "series":        result = compareNullableStringsAsc(l.name, r.name); break;
            case "dataType":      result = compareNullableStringsAsc(l.dataType, r.dataType); break;
            case "value":         result = compareNullableNumbersAsc(l.value, r.value); break;
            case "monthlyChange": result = compareNullableNumbersAsc(l.monthlyChangePercent, r.monthlyChangePercent); break;
            case "annualChange":  result = compareNullableNumbersAsc(l.annualChangePercent, r.annualChangePercent); break;
            case "date":          result = compareNullableDatesAsc(l.date, r.date); break;
            default:              result = compareNullableStringsAsc(l.name, r.name);
        }

        if (result === 0) result = compareNullableStringsAsc(l.seriesCode, r.seriesCode);
        return applySortDirection(result, sortConfig.direction);
    });
}

export function sortViopRows(rows: ViopContractPriceResponse[], sortConfig: MarketSortState["viop"]) {
    return [...rows].sort((l, r) => {
        let result = 0;

        switch (sortConfig.key) {
            case "contract":     result = compareNullableStringsAsc(l.contractName, r.contractName); break;
            case "segment":      result = compareNullableStringsAsc(l.marketSegment, r.marketSegment); break;
            case "underlying":   result = compareNullableStringsAsc(l.underlyingSymbol, r.underlyingSymbol); break;
            case "maturity":     result = compareNullableStringsAsc(l.maturityText, r.maturityText); break;
            case "price":        result = compareNullableNumbersAsc(l.lastPrice, r.lastPrice); break;
            case "change":       result = compareNullableNumbersAsc(l.changePercent, r.changePercent); break;
            case "changeAmount": result = compareNullableNumbersAsc(l.changeAmount, r.changeAmount); break;
            case "volumeTry":    result = compareNullableNumbersAsc(l.volumeTry, r.volumeTry); break;
            case "quantity":     result = compareNullableNumbersAsc(l.volumeQuantity, r.volumeQuantity); break;
            case "date":         result = compareNullableDatesAsc(l.tradeDate, r.tradeDate); break;
            case "fetchedAt":    result = compareNullableDatesAsc(l.fetchedAt, r.fetchedAt); break;
            default:             result = compareNullableStringsAsc(l.contractName, r.contractName);
        }

        if (result === 0) result = compareNullableStringsAsc(l.contractName, r.contractName);
        return applySortDirection(result, sortConfig.direction);
    });
}

export const matchesSearch = (query: string, ...fields: Array<string | null | undefined>): boolean => {
    if (!query) return true;
    const nq = normalizeSearch(query);
    return fields.some((f) => normalizeSearch(f ?? "").includes(nq));
};

export function dedupeStocksByLatestSnapshot(rows: StockResponse[]): StockResponse[] {
    const latestBySymbol = new Map<string, StockResponse>();

    rows.forEach((row) => {
        const current = latestBySymbol.get(row.symbol);
        if (!current) {
            latestBySymbol.set(row.symbol, row);
            return;
        }

        const currentTime = current.fetchedAt ? new Date(current.fetchedAt).getTime() : 0;
        const nextTime = row.fetchedAt ? new Date(row.fetchedAt).getTime() : 0;

        if (nextTime > currentTime) {
            latestBySymbol.set(row.symbol, row);
            return;
        }

        if (nextTime === currentTime && (row.tradeDate ?? "") >= (current.tradeDate ?? "")) {
            latestBySymbol.set(row.symbol, row);
        }
    });

    return [...latestBySymbol.values()];
}

export function buildFxMarketCards(rows: FxResponse[]): SummaryCard[] {
    const usd = rows.find((r) => r.currencyCode === "USD");
    const eur = rows.find((r) => r.currencyCode === "EUR");
    const narrowest = [...rows]
        .filter((r) => getFxSpread(r) !== null)
        .sort((l, r) => compareNullableNumbersAsc(getFxSpread(l), getFxSpread(r)))[0];
    const noData = i18n.t("market.summaryCards.noData");

    return [
        {
            label: i18n.t("market.summaryCards.usdSell"),
            value: formatRate(usd?.forexSelling),
            note: usd ? `${formatLocalDate(usd.rateDate)} · ${formatUnitLabel(usd.unit, usd.currencyCode)}` : noData,
        },
        {
            label: i18n.t("market.summaryCards.eurSell"),
            value: formatRate(eur?.forexSelling),
            note: eur ? `${formatLocalDate(eur.rateDate)} · ${formatUnitLabel(eur.unit, eur.currencyCode)}` : noData,
        },
        {
            label: i18n.t("market.summaryCards.narrowestSpread"),
            value: narrowest ? formatRate(getFxSpread(narrowest)) : "-",
            note: narrowest
                ? `${formatUnitLabel(narrowest.unit, narrowest.currencyCode)} · ${narrowest.currencyName}`
                : noData,
        },
    ];
}

export function buildBondMarketCards(rows: BondResponse[]): SummaryCard[] {
    const highestInterest = [...rows].sort((l, r) => compareNullableNumbersDesc(l.interestRate, r.interestRate))[0];
    const highestCompounded = [...rows].sort((l, r) => compareNullableNumbersDesc(l.compoundedRate, r.compoundedRate))[0];
    const shortestMaturity = [...rows].sort((l, r) => compareNullableNumbersAsc(l.maturityDays, r.maturityDays))[0];
    const noData = i18n.t("market.summaryCards.noData");

    return [
        {
            label: i18n.t("market.summaryCards.highestInterest"),
            value: highestInterest?.interestRate != null ? `%${formatNumber(highestInterest.interestRate, 2)}` : "-",
            note: highestInterest ? highestInterest.name : noData,
        },
        {
            label: i18n.t("market.summaryCards.highestCompound"),
            value: highestCompounded?.compoundedRate != null ? `%${formatNumber(highestCompounded.compoundedRate, 2)}` : "-",
            note: highestCompounded ? highestCompounded.name : noData,
        },
        {
            label: i18n.t("market.summaryCards.shortestMaturity"),
            value: shortestMaturity?.maturityDays != null
                ? `${formatWholeNumber(shortestMaturity.maturityDays)} ${i18n.t("market.bond.days")}`
                : "-",
            note: shortestMaturity ? shortestMaturity.name : noData,
        },
    ];
}

export function buildFundMarketCards(rows: FundResponse[]): SummaryCard[] {
    const bySize = [...rows].sort((l, r) => compareNullableNumbersDesc(l.portfolioSize, r.portfolioSize))[0];
    const byInvestors = [...rows].sort((l, r) => compareNullableNumbersDesc(l.investorCount, r.investorCount))[0];
    const averagePrice =
        rows.length > 0 ? rows.reduce((sum, r) => sum + (toSafeNumber(r.price) ?? 0), 0) / rows.length : null;
    const noData = i18n.t("market.summaryCards.noData");

    return [
        {
            label: i18n.t("market.summaryCards.largestFund"),
            value: bySize ? formatCompactMoney(bySize.portfolioSize, "TRY") : "-",
            note: bySize ? `${bySize.code} · ${bySize.name}` : noData,
        },
        {
            label: i18n.t("market.summaryCards.mostInvestors"),
            value: byInvestors ? formatCompactNumber(byInvestors.investorCount) : "-",
            note: byInvestors ? `${byInvestors.code} · ${byInvestors.name}` : noData,
        },
        {
            label: i18n.t("market.summaryCards.avgPrice"),
            value: averagePrice === null ? "-" : formatMoney(averagePrice, "TRY", 4),
            note: rows.length > 0
                ? `${formatWholeNumber(rows.length)} ${i18n.t("market.summaryCards.fundUnit")}`
                : noData,
        },
    ];
}

export function buildStockMarketCards(rows: StockResponse[]): SummaryCard[] {
    const noData = i18n.t("market.summaryCards.noData");

    if (rows.length === 0) {
        return [
            { label: i18n.t("market.summaryCards.stockEmpty"), value: noData, note: i18n.t("market.summaryCards.stockWaitingNote") },
            { label: i18n.t("market.summaryCards.stockUpdate"), value: "-", note: i18n.t("market.summaryCards.stockUpdateNote") },
            { label: i18n.t("market.summaryCards.stockStatus"), value: i18n.t("market.summaryCards.stockWaiting"), note: i18n.t("market.summaryCards.stockStatusNote") },
        ];
    }

    const topGainer = [...rows].sort((l, r) => compareNullableNumbersDesc(l.changePercent, r.changePercent))[0];
    const topVolume = [...rows].sort((l, r) => compareNullableNumbersDesc(l.volume, r.volume))[0];
    const topMarketCap = [...rows].sort((l, r) => compareNullableNumbersDesc(l.marketCap, r.marketCap))[0];
    const stockLabel = i18n.t("market.stock.label");

    return [
        {
            label: i18n.t("market.summaryCards.dayLeader"),
            value: formatPercent(topGainer?.changePercent),
            note: topGainer ? `${topGainer.symbol} · ${formatMoney(topGainer.price, topGainer.currency ?? "TRY")}` : noData,
            tone: toSafeNumber(topGainer?.changePercent) !== null && (topGainer?.changePercent ?? 0) < 0 ? "down" : "up",
        },
        {
            label: i18n.t("market.summaryCards.highestVolume"),
            value: topVolume ? formatCompactNumber(topVolume.volume) : "-",
            note: topVolume ? `${topVolume.symbol} · ${topVolume.shortName ?? topVolume.longName ?? stockLabel}` : noData,
        },
        {
            label: i18n.t("market.summaryCards.highestMarketCap"),
            value: topMarketCap ? formatCompactMoney(topMarketCap.marketCap, topMarketCap.currency ?? "TRY") : "-",
            note: topMarketCap ? `${topMarketCap.symbol} · ${topMarketCap.indexName ?? "BIST"}` : noData,
        },
    ];
}

const getLatestBySeries = (rows: MacroObservationResponse[]) => {
    const latest = new Map<string, MacroObservationResponse>();

    rows.forEach((row) => {
        const current = latest.get(row.seriesCode);
        if (!current || (row.date ?? "") > (current.date ?? "")) {
            latest.set(row.seriesCode, row);
        }
    });

    return [...latest.values()];
};

export function buildMacroMarketCards(inflationRows: MacroObservationResponse[], depositRows: MacroObservationResponse[]): SummaryCard[] {
    const latestInflation = getLatestBySeries(inflationRows).sort((l, r) => compareNullableDatesAsc(r.date, l.date))[0];
    const latestDeposits = getLatestBySeries(depositRows);
    const highestDeposit = [...latestDeposits].sort((l, r) => compareNullableNumbersDesc(l.value, r.value))[0];
    const noData = i18n.t("market.summaryCards.noData");

    return [
        {
            label: i18n.t("market.summaryCards.latestInflation"),
            value: latestInflation?.value != null ? formatNumber(latestInflation.value, 2) : "-",
            note: latestInflation
                ? `${formatLocalDate(latestInflation.date)} · ${latestInflation.unit ?? i18n.t("market.summaryCards.inflationUnit")}`
                : noData,
        },
        {
            label: i18n.t("market.summaryCards.annualChange"),
            value: formatPercent(latestInflation?.annualChangePercent),
            note: latestInflation?.name ?? i18n.t("market.summaryCards.inflationSeriesFallback"),
            tone: toSafeNumber(latestInflation?.annualChangePercent) !== null && (latestInflation?.annualChangePercent ?? 0) < 0 ? "down" : "up",
        },
        {
            label: i18n.t("market.summaryCards.highestDeposit"),
            value: highestDeposit?.value != null ? `%${formatNumber(highestDeposit.value, 2)}` : "-",
            note: highestDeposit ? `${highestDeposit.name} · ${formatLocalDate(highestDeposit.date)}` : noData,
        },
    ];
}

export function buildViopMarketCards(rows: ViopContractPriceResponse[]): SummaryCard[] {
    const highestVolume = [...rows].sort((l, r) => compareNullableNumbersDesc(l.volumeTry, r.volumeTry))[0];
    const strongest = [...rows].sort((l, r) => compareNullableNumbersDesc(l.changePercent, r.changePercent))[0];
    const noData = i18n.t("market.summaryCards.noData");

    return [
        {
            label: i18n.t("market.summaryCards.contractCount"),
            value: formatWholeNumber(rows.length),
            note: rows.length > 0 ? i18n.t("market.summaryCards.viopDefault") : noData,
        },
        {
            label: i18n.t("market.summaryCards.highestVolume"),
            value: highestVolume ? formatCompactMoney(highestVolume.volumeTry, "TRY") : "-",
            note: highestVolume?.contractName ?? noData,
        },
        {
            label: i18n.t("market.summaryCards.strongestChange"),
            value: formatPercent(strongest?.changePercent),
            note: strongest?.contractName ?? noData,
            tone: toSafeNumber(strongest?.changePercent) !== null && (strongest?.changePercent ?? 0) < 0 ? "down" : "up",
        },
    ];
}

export function getSummaryCards(tab: MarketTab, data: MarketData): SummaryCard[] {
    switch (tab) {
        case "fx":     return buildFxMarketCards(data.fx);
        case "bonds":  return buildBondMarketCards(data.bonds);
        case "funds":  return buildFundMarketCards(data.funds);
        case "stocks": return buildStockMarketCards(data.stocks);
        case "indexes": return buildStockMarketCards(data.indexes);
        case "commodities": return buildStockMarketCards(data.commodities);
        case "crypto": return buildStockMarketCards(data.crypto);
        case "macro":  return buildMacroMarketCards(data.macroInflation, data.macroDepositRates);
        case "viop":   return buildViopMarketCards(data.viop);
        default:       return [];
    }
}

export function getLatestDatasetDate(tab: MarketTab, data: MarketData): string {
    switch (tab) {
        case "fx":     return formatLocalDate(latestStringValue(data.fx.map((r) => r.rateDate)));
        case "bonds":  return formatLocalDate(latestStringValue(data.bonds.map((r) => r.rateDate)));
        case "funds":  return formatLocalDate(latestStringValue(data.funds.map((r) => r.priceDate)));
        case "stocks": return formatLocalDate(latestStringValue(data.stocks.map((r) => r.tradeDate)));
        case "indexes": return formatLocalDate(latestStringValue(data.indexes.map((r) => r.tradeDate)));
        case "commodities": return formatLocalDate(latestStringValue(data.commodities.map((r) => r.tradeDate)));
        case "crypto": return formatLocalDate(latestStringValue(data.crypto.map((r) => r.tradeDate)));
        case "macro":  return formatLocalDate(latestStringValue([...data.macroInflation, ...data.macroDepositRates].map((r) => r.date)));
        case "viop":   return formatLocalDate(latestStringValue(data.viop.map((r) => r.tradeDate)));
        default:       return "-";
    }
}
