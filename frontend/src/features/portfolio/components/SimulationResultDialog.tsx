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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Autocomplete,
    TextField,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SimulationResponse } from "../api/portfolioApi";
import { fetchWhatIfSimulation } from "../api/portfolioApi";
import { fetchFx, fetchFunds, fetchStocks } from "../../market/api/marketApi";
// YENİ COMPONENT IMPORTU
import { SimulationCardGroup } from "./SimulationCardGroup";

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

const OPPORTUNITY_CATEGORIES = [
    { id: "CURRENCY", label: "Döviz" },
    { id: "FUND", label: "Yatırım Fonu" },
    { id: "STOCK", label: "Hisse Senedi" }
];

function formatLocalDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatQuantity(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(value);
}

export function SimulationResultDialog({ target, data, busy, error, onClose, onRetry }: Props) {
    const [targetType, setTargetType] = useState<string>("CURRENCY");
    const [targetSymbol, setTargetSymbol] = useState<string>("");
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [availableSymbols, setAvailableSymbols] = useState<{value: string, label: string}[]>([]);

    const [whatIfData, setWhatIfData] = useState<SimulationResponse | null>(null);
    const [whatIfBusy, setWhatIfBusy] = useState<boolean>(false);
    const [whatIfError, setWhatIfError] = useState<string | null>(null);

    const handleCategoryChange = (newCategory: string) => {
        setTargetType(newCategory);
        setTargetSymbol("");
        setAvailableSymbols([]);
    };

    useEffect(() => {
        let isMounted = true;
        const loadSymbols = async () => {
            try {
                let formatted: { value: string, label: string }[] = [];
                if (targetType === "CURRENCY") {
                    const fxData = await fetchFx();
                    formatted = fxData.map(c => ({ value: c.currencyCode, label: `${c.currencyCode} — ${c.currencyName}` }));
                } else if (targetType === "FUND") {
                    const fundData = await fetchFunds({ includeUnpriced: true });
                    formatted = fundData.map(f => ({ value: f.code, label: `${f.code} — ${f.name}` }));
                } else if (targetType === "STOCK") {
                    const stockData = await fetchStocks();
                    formatted = stockData.map(s => ({ value: s.symbol, label: `${s.symbol} — ${s.shortName ?? 'Hisse'}` }));
                }

                if (isMounted) {
                    formatted.sort((a, b) => a.label.localeCompare(b.label, "tr-TR"));
                    setAvailableSymbols(formatted);
                    if (formatted.length > 0 && !targetSymbol) setTargetSymbol(formatted[0].value);
                }
            } catch (err) {
                console.error("Semboller yüklenemedi", err);
            }
        };
        loadSymbols();
        return () => { isMounted = false; };
    }, [targetType]);

    useEffect(() => {
        let isMounted = true;
        if (!isExpanded || !targetType || !targetSymbol) return;

        const loadWhatIfData = async () => {
            setWhatIfBusy(true);
            setWhatIfError(null);
            try {
                const res = await fetchWhatIfSimulation(target.id, targetType, targetSymbol, ["USD", "INFLATION_ADJUSTED"]);
                if (isMounted) setWhatIfData(res);
            } catch (err: any) {
                if (isMounted) setWhatIfError("Bu senaryo için geçmiş fiyat verisi bulunamadı.");
            } finally {
                if (isMounted) setWhatIfBusy(false);
            }
        };
        loadWhatIfData();
        return () => { isMounted = false; };
    }, [target.id, targetType, targetSymbol, isExpanded]);

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy Simülasyonu</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{target.title}</Typography>
                <Typography variant="body2" color="text.secondary">{target.subtitle}</Typography>
            </DialogTitle>

            <DialogContent>
                {busy && (
                    <Stack sx={{ alignItems: "center", py: 5, gap: 1 }}>
                        <CircularProgress size={28} />
                        <Typography variant="body2" color="text.secondary">Orijinal simülasyon hesaplanıyor...</Typography>
                    </Stack>
                )}

                {!busy && error && (
                    <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Tekrar dene</Button>}>
                        {error}
                    </Alert>
                )}

                {!busy && data ? (
                    <Stack sx={{ gap: 2, mt: 2 }}>
                        {/* 1. MEVCUT DURUM */}
                        <SimulationCardGroup data={data} />

                        <Divider sx={{ my: 1 }} />

                        {/* 2. ALTERNATİF SENARYOLAR */}
                        <Accordion
                            expanded={isExpanded}
                            onChange={(_, expanded) => setIsExpanded(expanded)}
                            sx={{ boxShadow: "none", border: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>
                                    Alternatif Senaryolar (Sanal Pozisyon)
                                </Typography>
                            </AccordionSummary>

                            <AccordionDetails>
                                <Stack direction="column" sx={{ gap: 3, pt: 1 }}>
                                    {/* ÜST BÖLÜM: KONTROL MENÜLERİ YAN YANA */}
                                    <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel id="category-label">Enstrüman Türü</InputLabel>
                                            <Select
                                                labelId="category-label"
                                                value={targetType}
                                                label="Enstrüman Türü"
                                                onChange={(e) => handleCategoryChange(e.target.value)}
                                            >
                                                {OPPORTUNITY_CATEGORIES.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.label}</MenuItem>)}
                                            </Select>
                                        </FormControl>

                                        <Autocomplete
                                            size="small"
                                            fullWidth
                                            disabled={availableSymbols.length === 0}
                                            options={availableSymbols}
                                            getOptionLabel={(option) => option.label}
                                            value={availableSymbols.find(s => s.value === targetSymbol) || undefined}
                                            onChange={(_, newValue) => setTargetSymbol(newValue ? newValue.value : "")}
                                            disableClearable
                                            renderInput={(params) => <TextField {...params} label="Bunun Yerine..." />}
                                        />
                                    </Stack>

                                    {/* ALT BÖLÜM: 3'LÜ KART GRUBU (TAM GENİŞLİKTE) */}
                                    <Box sx={{ position: 'relative', minHeight: 165 }}>
                                        {whatIfBusy && (
                                            <Box sx={{
                                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                bgcolor: 'background.paper', opacity: 0.8, zIndex: 2, borderRadius: 1
                                            }}>
                                                <CircularProgress size={28} />
                                            </Box>
                                        )}

                                        {whatIfError ? (
                                            <Alert severity="warning" sx={{ height: '100%' }}>{whatIfError}</Alert>
                                        ) : whatIfData ? (
                                            <SimulationCardGroup
                                                data={whatIfData}
                                                baselineTitle={`${availableSymbols.find(i => i.value === targetSymbol)?.label || targetSymbol} (TRY)`}
                                            />
                                        ) : (
                                            <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                                                Karşılaştırmak istediğiniz enstrümanı seçin.
                                            </Alert>
                                        )}
                                    </Box>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Divider sx={{ my: 1 }} />

                        {/* 3. ORİJİNAL ÖZET */}
                        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1.5, flexWrap: "wrap" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flex: 1, minWidth: 120 }}>
                                <Typography variant="caption" color="text.secondary">Miktar</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatQuantity(data.summary.quantity)}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flex: 1, minWidth: 140 }}>
                                <Typography variant="caption" color="text.secondary">Giriş tarihi</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatLocalDate(data.summary.entryDate)}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flex: 1, minWidth: 120 }}>
                                <Typography variant="caption" color="text.secondary">Pozisyon</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>{data.summary.positionKind}</Typography>
                            </Box>
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