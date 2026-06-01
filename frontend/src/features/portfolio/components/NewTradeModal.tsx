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
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useTranslation } from "react-i18next";
import type { ManualPositionRequest, PortfolioInstrumentType, PortfolioResponse, PositionDirection, PositionKind } from "../api/portfolioApi";
import { formatMoney, formatSignedMoney } from "../utils/portfolioFormatters";
import { useNewTradeForm } from "../hooks/useNewTradeForm";

type Props = {
    portfolio: PortfolioResponse;
    busy: boolean;
    serverError: string | null;
    onClose: () => void;
    onSubmit: (payload: ManualPositionRequest) => Promise<void>;
};

export function NewTradeModal({ portfolio, busy, serverError, onClose, onSubmit }: Props) {
    const { t } = useTranslation();
    const {
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
    } = useNewTradeForm(portfolio, onSubmit);

    const isDeposit = instrumentType === "DEPOSIT";
    const isViop = instrumentType === "VIOP";
    const isBond = instrumentType === "BOND";
    const isClosed = positionKind === "CLOSED";

    const realOptions = options.filter(o => o.id !== -1);
    const hasSentinel = !isDeposit && options.some(o => o.id === -1);

    const entryPriceLabel =
        instrumentType === "CURRENCY" ? t("portfolio.newTrade.buyRate") :
        instrumentType === "VIOP"     ? t("portfolio.newTrade.contractPrice") :
                                        t("portfolio.newTrade.buyPrice");

    const totalCost = (() => {
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        if (isDeposit) return qty;
        const entry = Number(entryPrice);
        if (!Number.isFinite(entry) || entry <= 0) return null;
        const multiplier = isViop ? (Number(contractMultiplier) || 1) : 1;
        return qty * entry * multiplier;
    })();

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-modal>
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy Yönetimi</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {positionKind === "OPEN" ? "Mevcut Pozisyon Ekle" : "Geçmiş Pozisyon Ekle"}
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Box component="form" id="position-form" onSubmit={handleSubmit} noValidate>
                    <Stack sx={{ gap: 2, pt: 1 }}>

                        {/* Bölüm 1: Pozisyon Türü */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                Pozisyon Türü
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                value={positionKind}
                                onChange={(_, val: PositionKind | null) => { if (val) setPositionKind(val); }}
                                size="small"
                                fullWidth
                            >
                                <ToggleButton value="OPEN">Mevcut Pozisyon</ToggleButton>
                                <ToggleButton value="CLOSED">Geçmiş Pozisyon</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Bölüm 2: Enstrüman Tipi */}
                        <FormControl size="small" fullWidth>
                            <InputLabel id="instrument-type-label">{t("portfolio.newTrade.instrumentType")}</InputLabel>
                            <Select
                                labelId="instrument-type-label"
                                value={instrumentType}
                                label={t("portfolio.newTrade.instrumentType")}
                                onChange={(e: SelectChangeEvent) => setInstrumentType(e.target.value as PortfolioInstrumentType)}
                            >
                                <MenuItem value="STOCK">{t("portfolio.types.stock")}</MenuItem>
                                <MenuItem value="FUND">{t("portfolio.types.fund")}</MenuItem>
                                <MenuItem value="CURRENCY">{t("portfolio.types.currency")}</MenuItem>
                                <MenuItem value="BOND">{t("portfolio.types.bond")}</MenuItem>
                                <MenuItem value="VIOP">{t("portfolio.types.viop")}</MenuItem>
                                <MenuItem value="DEPOSIT">{t("portfolio.types.deposit")}</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Enstrüman dropdown — DEPOSIT dışı tipler için */}
                        {!isDeposit && (
                            <FormControl size="small" fullWidth>
                                <InputLabel id="instrument-label">{t("portfolio.newTrade.instrument")}</InputLabel>
                                <Select
                                    labelId="instrument-label"
                                    value={instrumentId}
                                    label={t("portfolio.newTrade.instrument")}
                                    disabled={optionsLoading || options.length === 0}
                                    onChange={(e: SelectChangeEvent) => setInstrumentId(e.target.value)}
                                    startAdornment={optionsLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : undefined}
                                >
                                    <MenuItem value="" disabled>
                                        {optionsLoading ? t("portfolio.newTrade.loading") : t("portfolio.newTrade.select")}
                                    </MenuItem>
                                    {realOptions.map((option) => (
                                        <MenuItem key={`${option.type}-${option.id}`} value={String(option.id)}>
                                            {option.symbol} — {option.name}
                                        </MenuItem>
                                    ))}
                                    {hasSentinel && [
                                        <Divider key="divider" />,
                                        <MenuItem key="manual" value="-1">
                                            <em>Diğer (Manuel Giriş)</em>
                                        </MenuItem>,
                                    ]}
                                </Select>
                            </FormControl>
                        )}

                        {/* Manuel giriş alanları — "Diğer" seçilince (DEPOSIT dışı) */}
                        {!isDeposit && isManualEntry && (
                            <Stack direction="row" sx={{ gap: 1 }}>
                                <TextField
                                    label="Sembol"
                                    value={instrumentSymbolManual}
                                    onChange={(e) => setInstrumentSymbolManual(e.target.value)}
                                    size="small"
                                    sx={{ flex: 0.4 }}
                                />
                                <TextField
                                    label={t("portfolio.newTrade.instrumentName")}
                                    value={instrumentNameManual}
                                    onChange={(e) => setInstrumentNameManual(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1 }}
                                />
                            </Stack>
                        )}

                        {/* Vadeli Mevduat alanları */}
                        {isDeposit && (
                            <>
                                <TextField
                                    label={t("portfolio.newTrade.bank")}
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    size="small"
                                    fullWidth
                                />
                                <TextField
                                    label={t("portfolio.newTrade.interestRate")}
                                    type="number"
                                    value={interestRate}
                                    onChange={(e) => setInterestRate(e.target.value)}
                                    slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
                                    size="small"
                                    fullWidth
                                />
                            </>
                        )}

                        {optionsError && <Alert severity="error">{optionsError}</Alert>}

                        {/* Bölüm 3: VIOP Ek Alanlar */}
                        {isViop && (
                            <>
                                <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                            Pozisyon Yönü
                                        </Typography>
                                        <ToggleButtonGroup
                                            exclusive
                                            value={direction}
                                            onChange={(_, val: PositionDirection | null) => { if (val) setDirection(val); }}
                                            size="small"
                                        >
                                            <ToggleButton value="LONG" sx={{ color: "success.main", "&.Mui-selected": { bgcolor: "success.light", color: "success.dark" } }}>
                                                Long
                                            </ToggleButton>
                                            <ToggleButton value="SHORT" sx={{ color: "error.main", "&.Mui-selected": { bgcolor: "error.light", color: "error.dark" } }}>
                                                Short
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                    <TextField
                                        label={t("portfolio.newTrade.contractMultiplier")}
                                        type="number"
                                        value={contractMultiplier}
                                        onChange={(e) => setContractMultiplier(e.target.value)}
                                        slotProps={{ htmlInput: { min: "1", step: "1" } }}
                                        size="small"
                                        sx={{ flexGrow: 1 }}
                                    />
                                </Stack>
                                <Stack direction="row" sx={{ gap: 1 }}>
                                    <TextField
                                        label="Marjin / Teminat (TL)"
                                        type="number"
                                        value={marginAmount}
                                        onChange={(e) => setMarginAmount(e.target.value)}
                                        slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
                                        size="small"
                                        fullWidth
                                    />
                                    <TextField
                                        label="Vade Tarihi"
                                        type="date"
                                        value={maturityDate}
                                        onChange={(e) => setMaturityDate(e.target.value)}
                                        slotProps={{ inputLabel: { shrink: true } }}
                                        size="small"
                                        fullWidth
                                    />
                                </Stack>
                                {!isManualEntry && selectedOption?.maturityText && (
                                    <Typography variant="caption" color="text.secondary">
                                        Sistem vade bilgisi: {selectedOption.maturityText}
                                    </Typography>
                                )}
                                {(isManualEntry || selectedOption) && (
                                    <TextField
                                        label={t("portfolio.newTrade.underlying")}
                                        value={isManualEntry ? underlyingSymbolInput : (selectedOption?.name ?? "")}
                                        onChange={isManualEntry ? (e) => setUnderlyingSymbolInput(e.target.value) : undefined}
                                        slotProps={{ input: { readOnly: !isManualEntry } }}
                                        size="small"
                                        fullWidth
                                    />
                                )}
                            </>
                        )}

                        {/* BOND: Faiz Oranı + Vade Tarihi */}
                        {isBond && (
                            <Stack direction="row" sx={{ gap: 1 }}>
                                <TextField
                                    label={t("portfolio.newTrade.interestRate")}
                                    type="number"
                                    value={interestRate}
                                    onChange={(e) => setInterestRate(e.target.value)}
                                    slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
                                    size="small"
                                    fullWidth
                                />
                                <TextField
                                    label="Vade Tarihi"
                                    type="date"
                                    value={maturityDate}
                                    onChange={(e) => setMaturityDate(e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    size="small"
                                    fullWidth
                                />
                            </Stack>
                        )}

                        {/* Bölüm 4: Pozisyon Bilgileri */}
                        {isDeposit ? (
                            <TextField
                                label="Anapara (TL)"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                slotProps={{ htmlInput: { min: "0.000001", step: "0.01" } }}
                                size="small"
                                fullWidth
                            />
                        ) : (
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
                                    label={entryPriceLabel}
                                    type="number"
                                    value={entryPrice}
                                    onChange={(e) => setEntryPrice(e.target.value)}
                                    slotProps={{ htmlInput: { min: "0.000001", step: "0.000001" } }}
                                    size="small"
                                    fullWidth
                                />
                            </Stack>
                        )}

                        <TextField
                            label={t("portfolio.newTrade.buyDate")}
                            type="date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            size="small"
                            fullWidth
                        />

                        {isClosed && (
                            <Stack direction="row" sx={{ gap: 1 }}>
                                <TextField
                                    label={t("portfolio.newTrade.sellPrice")}
                                    type="number"
                                    value={exitPrice}
                                    onChange={(e) => setExitPrice(e.target.value)}
                                    slotProps={{ htmlInput: { min: "0.000001", step: "0.000001" } }}
                                    size="small"
                                    fullWidth
                                />
                                <TextField
                                    label={t("portfolio.newTrade.sellDate")}
                                    type="date"
                                    value={exitDate}
                                    onChange={(e) => setExitDate(e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    size="small"
                                    fullWidth
                                />
                            </Stack>
                        )}

                        {isDeposit && (
                            <TextField
                                label="Vade Tarihi"
                                type="date"
                                value={maturityDate}
                                onChange={(e) => setMaturityDate(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                size="small"
                                fullWidth
                            />
                        )}

                        {/* Bölüm 5: P&L Özeti */}
                        <Box sx={{ bgcolor: "action.hover", borderRadius: 1, px: 2, py: 1.25 }}>
                            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="caption" color="text.secondary">
                                    Toplam Maliyet
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                                    {formatMoney(totalCost, "TRY")}
                                </Typography>
                            </Stack>
                            {(isClosed || isDeposit) && (
                                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Tahmini P&L
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontWeight: 800,
                                            color: previewPnl === null ? "text.secondary" : previewPnl >= 0 ? "success.main" : "error.main",
                                        }}
                                    >
                                        {formatSignedMoney(previewPnl, "TRY")}
                                    </Typography>
                                </Stack>
                            )}
                        </Box>

                        {/* Bölüm 6: Notlar + Hata */}
                        <TextField
                            label="Notlar"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            multiline
                            rows={2}
                            size="small"
                            fullWidth
                            placeholder="İsteğe bağlı..."
                        />

                        {(localError ?? serverError) && (
                            <Alert severity="error">{localError ?? serverError}</Alert>
                        )}
                    </Stack>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>{t("portfolio.deleteModal.cancel")}</Button>
                <Button
                    type="submit"
                    form="position-form"
                    variant="contained"
                    color="secondary"
                    disabled={busy || optionsLoading}
                    startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                    {busy ? t("portfolio.form.saving") : "Pozisyon Kaydet"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
