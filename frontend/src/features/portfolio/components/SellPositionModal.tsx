import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { ClosePositionRequest, ManualPositionResponse, PortfolioInstrumentType } from "../api/portfolioApi";
import { INSTRUMENT_LABELS } from "../types";
import { formatMoney, formatPercent, formatQuantity, formatSignedMoney } from "../utils/portfolioFormatters";

type Props = {
    position: ManualPositionResponse;
    busy: boolean;
    error: string | null;
    onSubmit: (payload: ClosePositionRequest) => void;
    onClose: () => void;
};

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

const EXIT_PRICE_LABEL: Record<PortfolioInstrumentType, string> = {
    STOCK: "Satış Fiyatı (TL)",
    FUND: "Satış NAV (TL)",
    CURRENCY: "Satış Kuru",
    BOND: "Satış Fiyatı (TL)",
    VIOP: "Kapatma Fiyatı (TL)",
    DEPOSIT: "Çekim Tutarı (TL)",
};

const ACTION_LABEL: Record<PortfolioInstrumentType, string> = {
    STOCK: "Sat",
    FUND: "Sat",
    CURRENCY: "Sat",
    BOND: "Sat",
    VIOP: "Kapat",
    DEPOSIT: "Kapat",
};

export function SellPositionModal({ position, busy, error, onSubmit, onClose }: Props) {
    const [quantity, setQuantity] = useState(String(position.quantity));
    const [exitPrice, setExitPrice] = useState("");
    const [exitDate, setExitDate] = useState(today);

    const isViop = position.instrumentType === "VIOP";
    const maxQty = Number(position.quantity);
    const qty = Number(quantity);
    const price = Number(exitPrice);

    const previewPnl = useMemo<number | null>(() => {
        if (!Number.isFinite(qty) || qty <= 0) return null;
        if (!Number.isFinite(price) || price <= 0) return null;
        const multiplier = Number(position.contractMultiplier ?? 1);
        const dirSign = isViop && position.direction === "SHORT" ? -1 : 1;
        return (price - Number(position.entryPrice)) * qty * multiplier * dirSign;
    }, [qty, price, position.entryPrice, position.contractMultiplier, isViop, position.direction]);

    const isValid =
        Number.isFinite(qty) && qty > 0 && qty <= maxQty &&
        Number.isFinite(price) && price > 0 &&
        Boolean(exitDate);

    const handleSubmit = () => {
        if (!isValid) return;
        onSubmit({ exitPrice: price, exitDate, quantity: qty });
    };

    const actionLabel = ACTION_LABEL[position.instrumentType];
    const symbol = position.instrumentSymbol ?? position.bankName ?? INSTRUMENT_LABELS[position.instrumentType];

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>
                    {actionLabel === "Sat" ? "Pozisyonu Sat" : "Pozisyonu Kapat"}
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Stack sx={{ gap: 2 }}>
                    {/* Position summary */}
                    <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                        <Chip label={INSTRUMENT_LABELS[position.instrumentType]} size="small" variant="outlined" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{symbol}</Typography>
                        {isViop && (
                            <Chip
                                label={position.direction === "LONG" ? "Long" : "Short"}
                                size="small"
                                color={position.direction === "LONG" ? "success" : "error"}
                                variant="outlined"
                            />
                        )}
                    </Stack>

                    <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.5 }}>
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                            <Typography variant="caption" color="text.secondary">Alış Fiyatı</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {formatMoney(Number(position.entryPrice), "TRY", 4)}
                            </Typography>
                        </Stack>
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                            <Typography variant="caption" color="text.secondary">Mevcut Miktar</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {formatQuantity(Number(position.quantity))}
                            </Typography>
                        </Stack>
                        {position.currentPrice != null && (
                            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                                <Typography variant="caption" color="text.secondary">Anlık Fiyat</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    {formatMoney(Number(position.currentPrice), "TRY", 4)}
                                </Typography>
                            </Stack>
                        )}
                    </Box>

                    <Stack direction="row" sx={{ gap: 1, alignItems: "flex-end" }}>
                        <TextField
                            label="Satılacak Miktar"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            slotProps={{ htmlInput: { min: "0.000001", max: String(maxQty), step: "0.000001" } }}
                            size="small"
                            fullWidth
                            error={Number.isFinite(qty) && qty > maxQty}
                            helperText={Number.isFinite(qty) && qty > maxQty ? "Miktarı aşıyor" : undefined}
                        />
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setQuantity(String(position.quantity))}
                            sx={{ whiteSpace: "nowrap", flexShrink: 0, height: 40 }}
                        >
                            Tam {actionLabel}
                        </Button>
                    </Stack>

                    <TextField
                        label={EXIT_PRICE_LABEL[position.instrumentType]}
                        type="number"
                        value={exitPrice}
                        onChange={(e) => setExitPrice(e.target.value)}
                        slotProps={{ htmlInput: { min: "0.000001", step: "0.000001" } }}
                        size="small"
                        fullWidth
                    />

                    <TextField
                        label={actionLabel === "Sat" ? "Satış Tarihi" : "Kapatma Tarihi"}
                        type="date"
                        value={exitDate}
                        onChange={(e) => setExitDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        size="small"
                        fullWidth
                    />

                    {previewPnl !== null && (
                        <>
                            <Divider />
                            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="caption" color="text.secondary">Tahmini K/Z</Typography>
                                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.3, px: 0.75, py: 0.2, borderRadius: 0.75, bgcolor: previewPnl > 0 ? "rgba(46,125,50,0.10)" : previewPnl < 0 ? "rgba(211,47,47,0.10)" : "transparent" }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: previewPnl > 0 ? "success.main" : previewPnl < 0 ? "error.main" : "text.secondary" }}>
                                        {previewPnl > 0 ? "▲ " : previewPnl < 0 ? "▼ " : ""}
                                        {formatSignedMoney(previewPnl, "TRY")}
                                        <span style={{ fontSize: "0.8em", marginLeft: 4 }}>
                                            ({formatPercent((previewPnl / (Number(position.entryPrice) * qty)) * 100)})
                                        </span>
                                    </Typography>
                                </Box>
                            </Stack>
                            {qty < maxQty && (
                                <Typography variant="caption" color="text.secondary">
                                    Kalan {formatQuantity(maxQty - qty)} adet açık pozisyon olarak tutulacak.
                                </Typography>
                            )}
                        </>
                    )}

                    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button variant="text" color="inherit" onClick={onClose} disabled={busy}>
                    Vazgeç
                </Button>
                <Button
                    variant="contained"
                    color={actionLabel === "Sat" ? "secondary" : "primary"}
                    onClick={handleSubmit}
                    disabled={!isValid || busy}
                    startIcon={busy ? <CircularProgress size={16} /> : undefined}
                >
                    {actionLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
