import { useState, useEffect } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";

import type { SimulationLensResult, SimulationResponse } from "../api/portfolioApi";
import { formatMoney, formatPercent, formatQuantity, formatSignedMoney, getProfitTone } from "../utils/portfolioFormatters";
import { fetchWhatIfSimulation } from "../api/portfolioApi";
import { fetchFx, fetchFunds,fetchStocks } from "../../market/api/marketApi";

type SimulationTarget = {
    id: number;
    title: string;
    subtitle: string;
};

type Props = {
    target: SimulationTarget;
    data: SimulationResponse | null;
    busy: boolean;
    error: string | null;
    onClose: () => void;
    onRetry: () => void;
};

// KATEGORİ SÖZLÜĞÜ (İleride STOCK, FUND eklemek için burada kalıyor)
const OPPORTUNITY_CATEGORIES = [
    { id: "CURRENCY", label: "Döviz" },
    { id: "FUND", label: "Yatırım Fonu" },
    { id: "STOCK", label: "Hisse Senedi" }
];

const toneColor = (value: number | null | undefined) => {
    const tone = getProfitTone(value);
    if (tone === "up") return "success.main";
    if (tone === "down") return "error.main";
    return "text.secondary";
};

function formatLocalDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function RateRow({ label, value }: { label: string; value: number | string | null | undefined }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right" }}>
                {typeof value === "number" ? formatMoney(value, "TRY", 4) : value ?? "-"}
            </Typography>
        </Box>
    );
}

function ResultBlock({ title, result }: { title: string; result: SimulationLensResult }) {
    return (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, minWidth: 0, flex: 1 }}>
            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{title}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: toneColor(result.absolutePnl), mt: 0.5 }}>
                {formatSignedMoney(result.absolutePnl, result.currency)}
            </Typography>
            <Typography variant="body2" color={toneColor(result.percentagePnl)} sx={{ fontWeight: 700, mb: 1.5 }}>
                {formatPercent(result.percentagePnl)}
            </Typography>
            <Stack sx={{ gap: 0.75 }}>
                <RateRow label="Maliyet (Sanal)" value={formatMoney(result.costBasis, result.currency)} />
                <RateRow label="Güncel Değer" value={formatMoney(result.currentValue, result.currency)} />
                {result.purchaseRate !== null ? <RateRow label="O Günkü Fiyat" value={result.purchaseRate} /> : null}
            </Stack>
        </Box>
    );
}

export function SimulationResultDialog({ target, data, busy, error, onClose, onRetry }: Props) {
    const usdResult = data?.lenses.USD ?? null;
    const inflationResult = data?.lenses.INFLATION_ADJUSTED ?? null;

    // WHAT-IF STATE YÖNETİMİ
    const [targetType, setTargetType] = useState<string>("CURRENCY");
    const [targetSymbol, setTargetSymbol] = useState<string>("");

    // YENİ: DİNAMİK LİSTE STATE'İ
    const [availableSymbols, setAvailableSymbols] = useState<{value: string, label: string}[]>([]);

    const [whatIfResult, setWhatIfResult] = useState<SimulationLensResult | null>(null);
    const [whatIfBusy, setWhatIfBusy] = useState<boolean>(false);
    const [whatIfError, setWhatIfError] = useState<string | null>(null);

    // Kategori değiştiğinde listeyi ve seçimi temizle
    const handleCategoryChange = (newCategory: string) => {
        setTargetType(newCategory);
        setTargetSymbol("");
        setAvailableSymbols([]);
    };

    // 1. ADIM: DİNAMİK LİSTEYİ BACKEND'DEN ÇEKME MOTORU
    useEffect(() => {
        let isMounted = true;

        const loadSymbols = async () => {
            try {
                let formatted: { value: string, label: string }[] = [];

                if (targetType === "CURRENCY") {
                    const fxData = await fetchFx();
                    formatted = fxData.map(c => ({ value: c.currencyCode, label: `${c.currencyCode} — ${c.currencyName}` }));
                }
                // YENİ: FON LİSTESİ
                else if (targetType === "FUND") {
                    const fundData = await fetchFunds({ includeUnpriced: true });
                    formatted = fundData.map(f => ({ value: f.code, label: `${f.code} — ${f.name}` }));
                }
                // YENİ: HİSSE LİSTESİ
                else if (targetType === "STOCK") {
                    const stockData = await fetchStocks();
                    formatted = stockData.map(s => ({ value: s.symbol, label: `${s.symbol} — ${s.shortName ?? 'Hisse'}` }));
                }

                if (isMounted) {
                    formatted.sort((a, b) => a.label.localeCompare(b.label, "tr-TR"));
                    setAvailableSymbols(formatted);

                    if (formatted.length > 0 && !targetSymbol) {
                        setTargetSymbol(formatted[0].value);
                    }
                }
            } catch (err) {
                console.error("Semboller yüklenemedi", err);
            }
        };

        loadSymbols();
        return () => { isMounted = false; };
    }, [targetType]); // Sadece kategori değiştiğinde çalışır

    // 2. ADIM: SİMÜLASYON VERİSİNİ ÇEKME MOTORU
    useEffect(() => {
        let isMounted = true;
        if (!targetType || !targetSymbol) {
            setWhatIfResult(null);
            return;
        }

        const loadWhatIfData = async () => {
            setWhatIfBusy(true);
            setWhatIfError(null);
            try {
                const res = await fetchWhatIfSimulation(target.id, targetType, targetSymbol, []);
                if (isMounted) setWhatIfResult(res.baseline);
            } catch (err: any) {
                if (isMounted) setWhatIfError("Bu senaryo için geçmiş fiyat verisi bulunamadı.");
            } finally {
                if (isMounted) setWhatIfBusy(false);
            }
        };

        loadWhatIfData();
        return () => { isMounted = false; };
    }, [target.id, targetType, targetSymbol]);

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy Simülasyonu</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{target.title}</Typography>
                <Typography variant="body2" color="text.secondary">{target.subtitle}</Typography>
            </DialogTitle>

            <DialogContent>
                {busy ? (
                    <Stack sx={{ alignItems: "center", py: 5, gap: 1 }}>
                        <CircularProgress size={28} />
                        <Typography variant="body2" color="text.secondary">Orijinal simülasyon hesaplanıyor...</Typography>
                    </Stack>
                ) : null}

                {!busy && error ? (
                    <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Tekrar dene</Button>}>
                        {error}
                    </Alert>
                ) : null}

                {!busy && data ? (
                    <Stack sx={{ gap: 2, mt: 2 }}>
                        {/* 1. KATMAN: MEVCUT DURUM */}
                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                            <ResultBlock title="Nominal TRY" result={data.baseline} />
                            {usdResult ? <ResultBlock title="USD Bazlı" result={usdResult} /> : null}
                            {inflationResult ? <ResultBlock title="Enflasyon Bazlı" result={inflationResult} /> : null}
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* 2. KATMAN: WHAT-IF (GÖLGE POZİSYON) */}
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, display: 'block' }}>
                            Alternatif Senaryolar (Sanal Pozisyon)
                        </Typography>

                        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 2, alignItems: "stretch" }}>
                            {/* KONTROL PANELİ */}
                            <Box sx={{ minWidth: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, justifyContent: "center" }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="category-label">Enstrüman Türü</InputLabel>
                                    <Select labelId="category-label" value={targetType} label="Enstrüman Türü" onChange={(e) => handleCategoryChange(e.target.value)}>
                                        {OPPORTUNITY_CATEGORIES.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.label}</MenuItem>)}
                                    </Select>
                                </FormControl>

                                {/* YENİ: DİNAMİK LİSTE KULLANIMI */}
                                <FormControl fullWidth size="small" disabled={availableSymbols.length === 0}>
                                    <InputLabel id="symbol-label">Bunun Yerine...</InputLabel>
                                    <Select labelId="symbol-label" value={targetSymbol} label="Bunun Yerine..." onChange={(e) => setTargetSymbol(e.target.value)}>
                                        {availableSymbols.map(inst => <MenuItem key={inst.value} value={inst.value}>{inst.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>

                            {/* DİNAMİK SONUÇ EKRANI */}
                            {whatIfBusy ? (
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : whatIfError ? (
                                <Alert severity="warning" sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>{whatIfError}</Alert>
                            ) : whatIfResult ? (
                                <ResultBlock
                                    title={`${availableSymbols.find(i => i.value === targetSymbol)?.label || targetSymbol} Senaryosu`}
                                    result={whatIfResult}
                                />
                            ) : (
                                <Alert severity="info" sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>Simülasyon seçin.</Alert>
                            )}
                        </Stack>

                        <Divider sx={{ my: 1 }} />

                        {/* 3. KATMAN: ORİJİNAL ÖZET */}
                        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1.5, flexWrap: "wrap" }}>
                            <RateRow label="Miktar" value={formatQuantity(data.summary.quantity)} />
                            <RateRow label="Giriş tarihi" value={formatLocalDate(data.summary.entryDate)} />
                            <RateRow label="Pozisyon" value={data.summary.positionKind} />
                        </Stack>
                    </Stack>
                ) : null}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Kapat</Button>
            </DialogActions>
        </Dialog>
    );
}