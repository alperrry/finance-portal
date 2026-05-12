import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { OrderType, PortfolioResponse, TradeRequest, TransactionType } from "../api/portfolioApi";
import { ORDER_LABELS, TRANSACTION_LABELS } from "../types";
import type { PortfolioInstrumentType } from "../api/portfolioApi";
import { formatMoney, formatQuantity } from "../utils/portfolioFormatters";
import { useNewTradeForm } from "../hooks/useNewTradeForm";

type Props = {
    portfolio: PortfolioResponse;
    currentBalance: number | null;
    busy: boolean;
    serverError: string | null;
    onClose: () => void;
    onSubmit: (payload: TradeRequest) => Promise<void>;
};

export function NewTradeModal({ portfolio, currentBalance, busy, serverError, onClose, onSubmit }: Props) {
    const {
        transactionType, setTransactionType,
        orderType, setOrderType,
        instrumentType, setInstrumentType,
        instrumentId, setInstrumentId,
        quantity, setQuantity,
        targetPrice, setTargetPrice,
        localError,
        options, optionsLoading, optionsError,
        fxRatesError,
        selectedOption,
        totalAmount,
        insufficientBalance,
        missingConversion,
        ownedQuantity,
        handleSubmit,
    } = useNewTradeForm(portfolio, currentBalance, onSubmit);

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
                                onChange={(e: SelectChangeEvent) => setInstrumentType(e.target.value as PortfolioInstrumentType)}
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
                                onChange={(e: SelectChangeEvent) => setInstrumentId(e.target.value)}
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

                        {optionsError && <Alert severity="error">{optionsError}</Alert>}
                        {fxRatesError && <Alert severity="warning">{fxRatesError}</Alert>}
                        {selectedOption && selectedOption.currency !== portfolio.displayCurrency && (
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                Güncel fiyat {formatMoney(selectedOption.price, selectedOption.currency, 4)} üzerinden {portfolio.displayCurrency} karşılığıyla işlem girilir.
                            </Alert>
                        )}

                        <Stack direction="row" sx={{ gap: 1 }}>
                            <TextField
                                label="Miktar"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                slotProps={{ htmlInput: { min: "0.000001", step: "0.000001" } }}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label={`Hedef Fiyat (${portfolio.displayCurrency})`}
                                type="number"
                                value={targetPrice}
                                onChange={(e) => setTargetPrice(e.target.value)}
                                slotProps={{ htmlInput: { min: "0.000001", step: "0.000001" } }}
                                disabled={instrumentType === "BOND" || orderType === "MARKET"}
                                size="small"
                                fullWidth
                            />
                        </Stack>

                        {instrumentType === "BOND" && (
                            <Alert severity="info" sx={{ py: 0.5 }}>Tahvil işlemi anlık olarak gerçekleştirilecek.</Alert>
                        )}
                        {transactionType === "SELL" && instrumentId && (
                            ownedQuantity !== undefined ? (
                                <Alert severity="info" sx={{ py: 0.5 }}>Mevcut pozisyon: {formatQuantity(ownedQuantity)} adet</Alert>
                            ) : (
                                <Alert severity="warning" sx={{ py: 0.5 }}>Bu enstrümanda pozisyon bulunmuyor.</Alert>
                            )
                        )}

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: insufficientBalance ? "error.light" : "action.hover", borderRadius: 1, px: 2, py: 1.25 }}>
                            <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 800, color: insufficientBalance ? "error.dark" : "text.primary" }}>
                                {formatMoney(totalAmount, portfolio.displayCurrency)}
                            </Typography>
                        </Box>

                        {insufficientBalance && <Alert severity="error" sx={{ py: 0.5 }}>Bakiyeniz bu işlem için yetersiz.</Alert>}
                        {missingConversion && <Alert severity="warning" sx={{ py: 0.5 }}>Güncel döviz kuru bulunamadı, işlem gerçekleştirilemez.</Alert>}
                        {(localError ?? serverError) && <Alert severity="error">{localError ?? serverError}</Alert>}
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