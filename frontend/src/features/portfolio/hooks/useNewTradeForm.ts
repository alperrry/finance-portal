import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchBonds, fetchFunds, fetchFx, fetchStocks, fetchViopLatest } from "../../market/api/marketApi";
import type { BondResponse, FundResponse, FxResponse, StockResponse, ViopContractPriceResponse } from "../../market/api/marketApi";
import {
    type ManualPositionRequest,
    type PortfolioInstrumentType,
    type PortfolioResponse,
    type PositionDirection,
    type PositionKind,
} from "../api/portfolioApi";
import type { InstrumentOption } from "../types";
import { resolveApiError } from "../utils/portfolioFormatters";

const MANUAL_ENTRY_SENTINEL = "-1";

const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });

function todayString(): string {
    return new Date().toISOString().slice(0, 10);
}

function makeManualSentinel(type: PortfolioInstrumentType): InstrumentOption {
    return { id: -1, type, symbol: "DIĞER", name: "Diğer (Manuel Giriş)", price: null, currency: "TRY" };
}

function parseMaturityDate(text: string): string | null {
    const match = text.match(/^(\d{4})-(\d{2})$/);
    if (match) return `${match[1]}-${match[2]}-01`;
    return null;
}

function parseBondMaturityDate(seriesCode: string): string | null {
    const match = seriesCode.match(/(?:^|\.)TR[A-Z](\d{2})(\d{2})(\d{2})[A-Z0-9]*(?:\.|$)/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = 2000 + Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
    return {
        id: item.id,
        type: "BOND",
        symbol: item.evdsSeriesCode,
        name: item.name,
        price: item.interestRate,
        currency: item.currency ?? "TRY",
        maturityDate: parseBondMaturityDate(item.evdsSeriesCode),
    };
}

function mapViopOption(item: ViopContractPriceResponse): InstrumentOption | null {
    return {
        id: item.id,
        type: "VIOP",
        symbol: item.contractName,
        name: item.underlyingSymbol ?? item.contractName,
        price: item.lastPrice,
        currency: "TRY",
        maturityText: item.maturityText ?? null,
    };
}

export function useNewTradeForm(
    portfolio: PortfolioResponse,
    onSubmit: (payload: ManualPositionRequest) => Promise<void>,
) {
    const [positionKind, setPositionKind] = useState<PositionKind>("OPEN");
    const [instrumentType, setInstrumentType] = useState<PortfolioInstrumentType>("STOCK");
    const [instrumentId, setInstrumentId] = useState("");
    const [direction, setDirection] = useState<PositionDirection>("LONG");
    const [quantity, setQuantity] = useState("");
    const [entryPrice, setEntryPrice] = useState("");
    const [entryDate, setEntryDate] = useState(todayString);
    const [exitPrice, setExitPrice] = useState("");
    const [exitDate, setExitDate] = useState("");
    const [contractMultiplier, setContractMultiplier] = useState("100");
    const [maturityDate, setMaturityDate] = useState("");
    const [marginAmount, setMarginAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [bankName, setBankName] = useState("");
    const [notes, setNotes] = useState("");
    const [instrumentSymbolManual, setInstrumentSymbolManual] = useState("");
    const [instrumentNameManual, setInstrumentNameManual] = useState("");
    const [underlyingSymbolInput, setUnderlyingSymbolInput] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [options, setOptions] = useState<InstrumentOption[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [optionsError, setOptionsError] = useState<string | null>(null);

    // Load instrument options when type changes
    useEffect(() => {
        setInstrumentId("");
        setOptionsError(null);
        setInstrumentSymbolManual("");
        setInstrumentNameManual("");
        setUnderlyingSymbolInput("");
        setMaturityDate("");

        // DEPOSIT: no system list, user enters everything manually
        if (instrumentType === "DEPOSIT") {
            setOptions([]);
            setOptionsLoading(false);
            return undefined;
        }

        let active = true;
        setOptionsLoading(true);
        setOptions([]);

        const load = async () => {
            try {
                let mapped: (InstrumentOption | null)[];
                if (instrumentType === "STOCK") {
                    mapped = (await fetchStocks()).map(mapStockOption);
                } else if (instrumentType === "FUND") {
                    mapped = (await fetchFunds({ includeUnpriced: true })).map(mapFundOption);
                } else if (instrumentType === "CURRENCY") {
                    mapped = (await fetchFx()).map(mapFxOption);
                } else if (instrumentType === "BOND") {
                    mapped = (await fetchBonds({ includeUnpriced: true })).map(mapBondOption);
                } else {
                    // VIOP
                    mapped = (await fetchViopLatest()).map(mapViopOption);
                }
                if (!active) return;
                const sorted = mapped
                    .filter((i): i is InstrumentOption => i !== null)
                    .sort((a, b) => collator.compare(a.symbol, b.symbol));
                setOptions([...sorted, makeManualSentinel(instrumentType)]);
            } catch (err) {
                if (active) setOptionsError(resolveApiError(err, "Enstrüman listesi yüklenemedi."));
            } finally {
                if (active) setOptionsLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [instrumentType]);

    // VIOP: auto-fill maturity date from selected contract's maturityText
    useEffect(() => {
        if (instrumentType !== "VIOP" || !instrumentId || instrumentId === MANUAL_ENTRY_SENTINEL) return;
        const opt = options.find(o => String(o.id) === instrumentId);
        if (opt?.maturityText) {
            const parsed = parseMaturityDate(opt.maturityText);
            if (parsed) setMaturityDate(parsed);
        }
    }, [instrumentId, instrumentType, options]);

    const selectedOption = options.find((o) => String(o.id) === instrumentId) ?? null;

    useEffect(() => {
        if (instrumentType !== "BOND" || !selectedOption || selectedOption.id === -1) return;
        if (selectedOption.maturityDate) setMaturityDate(selectedOption.maturityDate);
    }, [instrumentType, selectedOption]);

    // Auto-fill entry price from selected instrument's market price.
    // BOND is skipped because it maps interestRate as price, which would mislead the user.
    // entryPrice is intentionally excluded from deps to avoid overwriting user edits on re-render.
    useEffect(() => {
        if (instrumentType === "BOND") return;
        if (!selectedOption || selectedOption.id === -1) return;
        if (selectedOption.price == null) return;
        if (entryPrice !== "") return;
        setEntryPrice(String(selectedOption.price));
    }, [selectedOption, instrumentType]); // eslint-disable-line react-hooks/exhaustive-deps
    const isManualEntry = instrumentId === MANUAL_ENTRY_SENTINEL;

    // P&L preview
    const previewPnl = useMemo<number | null>(() => {
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) return null;

        if (instrumentType === "DEPOSIT") {
            const rate = Number(interestRate);
            if (!Number.isFinite(rate) || rate <= 0) return null;
            return qty * (rate / 100);
        }

        const entry = Number(entryPrice);
        if (!Number.isFinite(entry) || entry <= 0) return null;

        if (positionKind === "CLOSED") {
            const exit = Number(exitPrice);
            if (!Number.isFinite(exit) || exit <= 0) return null;
            const multiplier = instrumentType === "VIOP" ? (Number(contractMultiplier) || 1) : 1;
            const dirMultiplier = (instrumentType === "VIOP" && direction === "SHORT") ? -1 : 1;
            return (exit - entry) * qty * multiplier * dirMultiplier;
        }

        return null;
    }, [quantity, entryPrice, exitPrice, contractMultiplier, instrumentType, positionKind, interestRate, direction]);

    const validate = (): string | null => {
        if (instrumentType !== "DEPOSIT") {
            if (!isManualEntry && !instrumentId) return "Enstrüman seçmelisin.";
            if (isManualEntry && !instrumentSymbolManual.trim() && !instrumentNameManual.trim()) {
                return "Sembol veya enstrüman adı girilmeli.";
            }
        }
        if (instrumentType === "DEPOSIT") {
            const rate = Number(interestRate);
            if (!Number.isFinite(rate) || rate <= 0) return "Faiz oranı 0'dan büyük olmalı.";
        }
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) return "Miktar 0'dan büyük olmalı.";
        if (instrumentType !== "DEPOSIT") {
            const entry = Number(entryPrice);
            if (!Number.isFinite(entry) || entry <= 0) return "Alış fiyatı 0'dan büyük olmalı.";
        }
        if (!entryDate) return "Alım tarihi gerekli.";
        if (positionKind === "CLOSED") {
            const exit = Number(exitPrice);
            if (!Number.isFinite(exit) || exit <= 0) return "Satış fiyatı 0'dan büyük olmalı.";
            if (!exitDate) return "Satım tarihi gerekli.";
        }
        return null;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const validationError = validate();
        if (validationError) {
            setLocalError(validationError);
            return;
        }
        setLocalError(null);

        const payload: ManualPositionRequest = {
            instrumentType,
            positionKind,
            instrumentId: instrumentType === "DEPOSIT" ? null : (isManualEntry ? null : (instrumentId ? Number(instrumentId) : null)),
            instrumentSymbol: (instrumentType !== "DEPOSIT" && isManualEntry) ? (instrumentSymbolManual.trim() || null) : null,
            instrumentName: (instrumentType !== "DEPOSIT" && isManualEntry) ? (instrumentNameManual.trim() || null) : null,
            direction: instrumentType === "VIOP" ? direction : undefined,
            quantity: Number(quantity),
            entryPrice: instrumentType === "DEPOSIT" ? 1 : Number(entryPrice),
            entryDate,
            exitPrice: exitPrice ? Number(exitPrice) : null,
            exitDate: exitDate || null,
            contractMultiplier: instrumentType === "VIOP" ? (Number(contractMultiplier) || null) : null,
            maturityDate: maturityDate || null,
            marginAmount: marginAmount ? Number(marginAmount) : null,
            underlyingSymbol: instrumentType === "VIOP"
                ? (isManualEntry ? (underlyingSymbolInput.trim() || null) : (selectedOption?.name ?? null))
                : null,
            interestRate: instrumentType === "DEPOSIT" ? (Number(interestRate) || null) : null,
            bankName: instrumentType === "DEPOSIT" ? (bankName.trim() || null) : null,
            notes: notes.trim() || null,
        };

        await onSubmit(payload);
    };

    return {
        positionKind, setPositionKind,
        instrumentType, setInstrumentType,
        instrumentId, setInstrumentId,
        direction, setDirection,
        quantity, setQuantity,
        entryPrice, setEntryPrice,
        entryDate, setEntryDate,
        exitPrice, setExitPrice,
        exitDate, setExitDate,
        contractMultiplier, setContractMultiplier,
        maturityDate, setMaturityDate,
        marginAmount, setMarginAmount,
        interestRate, setInterestRate,
        bankName, setBankName,
        notes, setNotes,
        instrumentSymbolManual, setInstrumentSymbolManual,
        instrumentNameManual, setInstrumentNameManual,
        underlyingSymbolInput, setUnderlyingSymbolInput,
        isManualEntry,
        localError,
        options, optionsLoading, optionsError,
        selectedOption,
        previewPnl,
        handleSubmit,
        portfolio,
    };
}
