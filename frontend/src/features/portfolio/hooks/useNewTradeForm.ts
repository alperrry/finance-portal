import { useEffect, useState, type FormEvent } from "react";
import { fetchBonds, fetchFunds, fetchFx, fetchStocks } from "../../market/api/marketApi";
import type { BondResponse, FundResponse, FxResponse, StockResponse } from "../../market/api/marketApi";
import type { OrderType, PortfolioInstrumentType, PortfolioResponse, TradeRequest, TransactionType } from "../api/portfolioApi";
import type { FxRateMap, InstrumentOption } from "../types";
import { buildFxRateMap, convertMoneyValue, resolveApiError } from "../utils/portfolioFormatters";

const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });

function mapStockOption(item: StockResponse): InstrumentOption | null {
    if (!item.id) return null;
    return { id: item.id, type: "STOCK", symbol: item.symbol, name: item.shortName ?? item.longName ?? "Hisse", price: item.price, currency: item.currency ?? "TRY" };
}
function mapFundOption(item: FundResponse): InstrumentOption | null {
    if (!item.id) return null;
    return { id: item.id, type: "FUND", symbol: item.code, name: item.name, price: item.price, currency: "TRY" };
}
function mapFxOption(item: FxResponse): InstrumentOption | null {
    if (!item.id) return null;
    return { id: item.id, type: "CURRENCY", symbol: item.currencyCode, name: item.currencyName, price: item.forexBuying, currency: "TRY" };
}
function mapBondOption(item: BondResponse): InstrumentOption | null {
    if (!item.id) return null;
    return { id: item.id, type: "BOND", symbol: item.evdsSeriesCode, name: item.name, price: item.interestRate, currency: item.currency ?? "TRY" };
}

export function useNewTradeForm(
    portfolio: PortfolioResponse,
    currentBalance: number | null,
    onSubmit: (payload: TradeRequest) => Promise<void>,
) {
    const [transactionType, setTransactionType] = useState<TransactionType>("BUY");
    const [orderType, setOrderType] = useState<OrderType>("LIMIT");
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
            .then((items) => { if (active) setFxRates(buildFxRateMap(items)); })
            .catch((err) => { if (active) setFxRatesError(resolveApiError(err, "Döviz dönüşüm kurları yüklenemedi.")); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        setOptionsLoading(true);
        setOptionsError(null);
        setOptions([]);
        setInstrumentId("");

        const load = async () => {
            try {
                const data = await (
                    instrumentType === "STOCK" ? fetchStocks().then((items) => items.map(mapStockOption))
                        : instrumentType === "FUND" ? fetchFunds().then((items) => items.map(mapFundOption))
                            : instrumentType === "CURRENCY" ? fetchFx().then((items) => items.map(mapFxOption))
                                : fetchBonds().then((items) => items.map(mapBondOption))
                );
                if (!active) return;
                setOptions(data.filter((i): i is InstrumentOption => i !== null).sort((a, b) => collator.compare(a.symbol, b.symbol)));
            } catch (err) {
                if (active) setOptionsError(resolveApiError(err, "Enstrüman listesi yüklenemedi."));
            } finally {
                if (active) setOptionsLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [instrumentType]);

    useEffect(() => {
        if (instrumentType === "BOND") setOrderType("MARKET");
    }, [instrumentType]);

    const selectedOption = options.find((o) => String(o.id) === instrumentId) ?? null;
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
    const priceNumber =
        (orderType === "MARKET" && selectedDisplayPrice) || (instrumentType === "BOND" && selectedDisplayPrice)
            ? selectedDisplayPrice!
            : Number(targetPrice);
    const totalAmount = Number.isFinite(quantityNumber) && Number.isFinite(priceNumber) ? quantityNumber * priceNumber : null;
    const requiredBalance = convertMoneyValue(totalAmount, portfolio.displayCurrency, "TRY", fxRates);
    const insufficientBalance = transactionType === "BUY" && currentBalance !== null && requiredBalance !== null && requiredBalance > currentBalance;
    const missingConversion = transactionType === "BUY" && totalAmount !== null && requiredBalance === null;
    const ownedQuantity = portfolio.items.find(
        (item) => item.instrumentType === instrumentType && String(item.instrumentId) === instrumentId,
    )?.quantity;

    const validate = (): string | null => {
        if (!instrumentId) return "Enstrüman seçmelisin.";
        if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) return "Miktar 0'dan büyük olmalı.";
        if (orderType === "LIMIT" && (!Number.isFinite(priceNumber) || priceNumber <= 0)) return "Hedef fiyat 0'dan büyük olmalı.";
        if (orderType === "MARKET" && (!Number.isFinite(priceNumber) || priceNumber <= 0)) return "Market order için güncel fiyat bulunamadı.";
        if (missingConversion) return "Bu işlem için güncel döviz dönüşüm kuru bulunamadı.";
        if (insufficientBalance) return "Bu işlem için bakiyeniz yetersiz.";
        return null;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const validationError = validate();
        if (validationError) { setLocalError(validationError); return; }
        setLocalError(null);
        await onSubmit({
            instrumentType,
            instrumentId: Number(instrumentId),
            transactionType,
            orderType,
            quantity: quantityNumber,
            targetPrice: orderType === "LIMIT" ? priceNumber : null,
        });
    };

    return {
        transactionType, setTransactionType,
        orderType, setOrderType,
        instrumentType, setInstrumentType,
        instrumentId, setInstrumentId,
        quantity, setQuantity,
        targetPrice, setTargetPrice,
        localError,
        options, optionsLoading, optionsError,
        fxRates, fxRatesError,
        selectedOption,
        selectedDisplayPrice,
        totalAmount,
        insufficientBalance,
        missingConversion,
        ownedQuantity,
        handleSubmit,
    };
}