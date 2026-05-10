import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useEffect, useState, type FormEvent } from "react";
import type { BondResponse, FundResponse, FxResponse, StockResponse } from "../../market/api/marketApi";
import { fetchBonds, fetchFunds, fetchFx, fetchStocks } from "../../market/api/marketApi";
import type { OrderType, PortfolioInstrumentType, PortfolioResponse, TradeRequest, TransactionType } from "../api/portfolioApi";
import { ORDER_LABELS, TRANSACTION_LABELS } from "../types";
import type { FxRateMap, InstrumentOption } from "../types";
import { buildFxRateMap, convertMoneyValue, formatMoney, formatQuantity, resolveApiError } from "../utils/portfolioFormatters";

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

type Props = {
    portfolio: PortfolioResponse;
    currentBalance: number | null;
    busy: boolean;
    serverError: string | null;
    onClose: () => void;
    onSubmit: (payload: TradeRequest) => Promise<void>;
};

export function NewTradeModal({ portfolio, currentBalance, busy, serverError, onClose, onSubmit }: Props) {
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
            .catch((caughtError) => { if (active) setFxRatesError(resolveApiError(caughtError, "Döviz dönüşüm kurları yüklenemedi.")); });
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
                    instrumentType === "STOCK"
                        ? fetchStocks().then((items) => items.map(mapStockOption))
                        : instrumentType === "FUND"
                          ? fetchFunds().then((items) => items.map(mapFundOption))
                          : instrumentType === "CURRENCY"
                            ? fetchFx().then((items) => items.map(mapFxOption))
                            : fetchBonds().then((items) => items.map(mapBondOption))
                );
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
        return () => { active = false; };
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

    useEffect(() => {
        if (instrumentType === "BOND") setOrderType("MARKET");
    }, [instrumentType]);

    const quantityNumber = Number(quantity);
    const priceNumber =
        (orderType === "MARKET" && selectedDisplayPrice) || (instrumentType === "BOND" && selectedDisplayPrice)
            ? selectedDisplayPrice!
            : Number(targetPrice);
    const totalAmount = Number.isFinite(quantityNumber) && Number.isFinite(priceNumber) ? quantityNumber * priceNumber : null;
    const requiredBalance = convertMoneyValue(totalAmount, portfolio.displayCurrency, "TRY", fxRates);
    const insufficientBalance =
        transactionType === "BUY" && currentBalance !== null && requiredBalance !== null && requiredBalance > currentBalance;
    const missingConversion = transactionType === "BUY" && totalAmount !== null && requiredBalance === null;
    const ownedQuantity = portfolio.items.find(
        (item) => item.instrumentType === instrumentType && String(item.instrumentId) === instrumentId,
    )?.quantity;

    const validate = () => {
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

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Trade Desk</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Yeni İşlem</Typography>
            </DialogTitle>
            <DialogContent>
                <Box component="form" id="new-trade-form" onSubmit={handleSubmit} noValidate>
                    <Stack sx={{ gap: 2, pt: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "action.hover", borderRadius: 1, px: 2, py: 1 }}>
                            <Typography variant="caption" color="text.secondary">Mevcut Bakiye (TRY)</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatMoney(currentBalance, "TRY")}</Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>İşlem tipi</Typography>
                            <ToggleButtonGroup
                                exclusive
                                value={transactionType}
                                onChange={(_, val: TransactionType | null) => { if (val) setTransactionType(val); }}
                                size="small"
                                fullWidth
                            >
                                {(["BUY", "SELL"] as TransactionType[]).map((type) => (
                                    <ToggleButton key={type} value={type} color={type === "BUY" ? "success" : "error"}>
                                        {TRANSACTION_LABELS[type]}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Emir tipi</Typography>
                            <ToggleButtonGroup
                                exclusive
                                value={orderType}
                                onChange={(_, val: OrderType | null) => { if (val) setOrderType(val); }}
                                size="small"
                                fullWidth
                            >
                                {(["MARKET", "LIMIT"] as OrderType[]).map((type) => (
                                    <ToggleButton key={type} value={type}>{ORDER_LABELS[type]}</ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>

                        <FormControl size="small" fullWidth>
                            <InputLabel id="instrument-type-label">Enstrüman Tipi</InputLabel>
                            <Select
                                labelId="instrument-type-label"
                                value={instrumentType}
                                label="Enstrüman Tipi"
                                onChange={(event: SelectChangeEvent) => setInstrumentType(event.target.value as PortfolioInstrumentType)}
                            >
                                <MenuItem value="STOCK">Hisse</MenuItem>
                                <MenuItem value="FUND">Fon</MenuItem>
                                <MenuItem value="CURRENCY">Döviz</MenuItem>
                                <MenuItem value="BOND">Tahvil</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel id="instrument-label">Enstrüman</InputLabel>
                            <Select
                                labelId="instrument-label"
                                value={instrumentId}
                                label="Enstrüman"
                                disabled={optionsLoading || options.length === 0}
                                onChange={(event: SelectChangeEvent) => setInstrumentId(event.target.value)}
                                startAdornment={optionsLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : undefined}
                            >
                                <MenuItem value="" disabled>{optionsLoading ? "Yükleniyor..." : "Seçiniz"}</MenuItem>
                                {options.map((option) => (
                                    <MenuItem key={`${option.type}-${option.id}`} value={String(option.id)}>
                                        {option.symbol} — {option.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {optionsError ? <Alert severity="error">{optionsError}</Alert> : null}
                        {fxRatesError ? <Alert severity="warning">{fxRatesError}</Alert> : null}
                        {selectedOption && selectedOption.currency !== portfolio.displayCurrency ? (
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                Güncel fiyat {formatMoney(selectedOption.price, selectedOption.currency, 4)} üzerinden {portfolio.displayCurrency} karşılığıyla işlem girilir.
                            </Alert>
                        ) : null}

                        <Stack direction="row" sx={{ gap: 1 }}>
                            <TextField
                                label="Miktar"
                                type="number"
                                value={quantity}
                                onChange={(event) => setQuantity(event.target.value)}
                                inputProps={{ min: "0.000001", step: "0.000001" }}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label={`Hedef Fiyat (${portfolio.displayCurrency})`}
                                type="number"
                                value={targetPrice}
                                onChange={(event) => setTargetPrice(event.target.value)}
                                inputProps={{ min: "0.000001", step: "0.000001" }}
                                disabled={instrumentType === "BOND" || orderType === "MARKET"}
                                size="small"
                                fullWidth
                            />
                        </Stack>

                        {instrumentType === "BOND" ? (
                            <Alert severity="info" sx={{ py: 0.5 }}>Tahvil işlemi anlık olarak gerçekleştirilecek.</Alert>
                        ) : null}
                        {transactionType === "SELL" && instrumentId ? (
                            ownedQuantity !== undefined ? (
                                <Alert severity="info" sx={{ py: 0.5 }}>Mevcut pozisyon: {formatQuantity(ownedQuantity)} adet</Alert>
                            ) : (
                                <Alert severity="warning" sx={{ py: 0.5 }}>Bu enstrümanda pozisyon bulunmuyor.</Alert>
                            )
                        ) : null}

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: insufficientBalance ? "error.light" : "action.hover", borderRadius: 1, px: 2, py: 1.25 }}>
                            <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 800, color: insufficientBalance ? "error.dark" : "text.primary" }}>
                                {formatMoney(totalAmount, portfolio.displayCurrency)}
                            </Typography>
                        </Box>

                        {insufficientBalance ? <Alert severity="error" sx={{ py: 0.5 }}>Bakiyeniz bu işlem için yetersiz.</Alert> : null}
                        {missingConversion ? <Alert severity="warning" sx={{ py: 0.5 }}>Güncel döviz kuru bulunamadı, işlem gerçekleştirilemez.</Alert> : null}
                        {localError ?? serverError ? <Alert severity="error">{localError ?? serverError}</Alert> : null}
                    </Stack>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>İptal</Button>
                <Button
                    type="submit"
                    form="new-trade-form"
                    variant="contained"
                    color="secondary"
                    disabled={busy || optionsLoading || insufficientBalance || missingConversion}
                    startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                    {busy ? "Gönderiliyor..." : "İşlem Talebi Gönder"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
