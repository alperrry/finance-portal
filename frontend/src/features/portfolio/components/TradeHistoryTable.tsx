import { Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Pagination, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useMemo } from "react";
import type { TradeResponse, TransactionStatus, TransactionType } from "../api/portfolioApi";
import { INSTRUMENT_LABELS, ORDER_LABELS, STATUS_LABELS, TRANSACTION_LABELS } from "../types";
import type { TradeFilters, TradeHistoryState } from "../types";
import { filterTrades, formatDateTime, formatMoney, formatNumber, formatQuantity, statusTone } from "../utils/portfolioFormatters";

const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });

const statusColor = (tone: string): "default" | "success" | "error" | "warning" | "info" => {
    if (tone === "success") return "success";
    if (tone === "error") return "error";
    if (tone === "warning") return "warning";
    return "default";
};

type Props = {
    state: TradeHistoryState;
    status: TransactionStatus | "";
    filters: TradeFilters;
    displayCurrency: string;
    onStatusChange: (status: TransactionStatus | "") => void;
    onFiltersChange: (filters: TradeFilters) => void;
    onPageChange: (page: number) => void;
    onCancel: (trade: TradeResponse) => void;
    onExportPdf: () => void;
    cancelingTradeId: number | null;
    exportBusy: boolean;
    canExport: boolean;
};

export function TradeHistoryTable({
    state,
    status,
    filters,
    displayCurrency,
    onStatusChange,
    onFiltersChange,
    onPageChange,
    onCancel,
    onExportPdf,
    cancelingTradeId,
    exportBusy,
    canExport,
}: Props) {
    const page = state.page;
    const trades = useMemo(() => filterTrades(page?.content ?? [], filters), [filters, page?.content]);
    const instrumentOptions = useMemo(() => {
        const unique = new Map<string, string>();
        (page?.content ?? []).forEach((trade) => {
            unique.set(
                `${trade.instrumentType}:${trade.instrumentId}`,
                trade.instrumentSymbol || `${INSTRUMENT_LABELS[trade.instrumentType]} #${trade.instrumentId}`,
            );
        });
        return [...unique.entries()].sort((left, right) => collator.compare(left[1], right[1]));
    }, [page?.content]);

    return (
        <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Lifecycle</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>İşlem Geçmişi</Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={onExportPdf}
                    disabled={!canExport || exportBusy}
                    startIcon={exportBusy ? <CircularProgress size={14} /> : undefined}
                >
                    {exportBusy ? "PDF hazırlanıyor..." : "PDF Rapor"}
                </Button>
            </Stack>

            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 2 }}>
                <TextField
                    type="date"
                    size="small"
                    label="Başlangıç"
                    value={filters.from}
                    onChange={(event) => onFiltersChange({ ...filters, from: event.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ minWidth: 150 }}
                />
                <TextField
                    type="date"
                    size="small"
                    label="Bitiş"
                    value={filters.to}
                    onChange={(event) => onFiltersChange({ ...filters, to: event.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ minWidth: 150 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="trade-instrument-label">Enstrüman</InputLabel>
                    <Select
                        labelId="trade-instrument-label"
                        value={filters.instrument}
                        label="Enstrüman"
                        onChange={(event: SelectChangeEvent) => onFiltersChange({ ...filters, instrument: event.target.value })}
                    >
                        <MenuItem value="">Tüm enstrümanlar</MenuItem>
                        {instrumentOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel id="trade-type-label">İşlem</InputLabel>
                    <Select
                        labelId="trade-type-label"
                        value={filters.type}
                        label="İşlem"
                        onChange={(event: SelectChangeEvent) => onFiltersChange({ ...filters, type: event.target.value as TransactionType | "" })}
                    >
                        <MenuItem value="">Tümü</MenuItem>
                        <MenuItem value="BUY">AL</MenuItem>
                        <MenuItem value="SELL">SAT</MenuItem>
                    </Select>
                </FormControl>
                <TextField
                    size="small"
                    label="Hisse kodu ara"
                    value={filters.query}
                    onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
                    sx={{ minWidth: 150 }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="trade-status-label">Durum</InputLabel>
                    <Select
                        labelId="trade-status-label"
                        value={status}
                        label="Durum"
                        onChange={(event: SelectChangeEvent) => onStatusChange(event.target.value as TransactionStatus | "")}
                    >
                        <MenuItem value="">Tüm durumlar</MenuItem>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>

            {state.loading ? (
                <Stack sx={{ alignItems: "center", py: 3 }}>
                    <CircularProgress size={24} />
                </Stack>
            ) : null}
            {!state.loading && state.error ? <Alert severity="error">{state.error}</Alert> : null}
            {!state.loading && !state.error && page && trades.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Bu filtrede işlem yok.</Typography>
            ) : null}

            {!state.loading && !state.error && page && trades.length > 0 ? (
                <>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {["Tarih", "Enstrüman", "Tip", "Emir", "Miktar", "Hedef", "Gerçekleşme", "Tutar", "Durum", "Aksiyon"].map((header) => (
                                        <TableCell key={header} sx={{ fontWeight: 700 }}>{header}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trades.map((trade) => {
                                    const tone = statusTone(trade.status);
                                    return (
                                        <TableRow key={trade.id}>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(trade.createdAt)}</TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{trade.instrumentSymbol || "Bilinmiyor"}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {trade.instrumentName || INSTRUMENT_LABELS[trade.instrumentType]}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={`${trade.transactionType === "BUY" ? "↘ " : "↗ "}${TRANSACTION_LABELS[trade.transactionType]}`}
                                                    size="small"
                                                    color={trade.transactionType === "BUY" ? "success" : "error"}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>{ORDER_LABELS[trade.orderType ?? "LIMIT"]}</TableCell>
                                            <TableCell>{formatQuantity(trade.quantity)}</TableCell>
                                            <TableCell>{formatNumber(trade.targetPrice, 4)}</TableCell>
                                            <TableCell>{formatNumber(trade.executedPrice, 4)}</TableCell>
                                            <TableCell>{formatMoney(trade.totalAmount, displayCurrency)}</TableCell>
                                            <TableCell>
                                                <Chip label={STATUS_LABELS[trade.status]} size="small" color={statusColor(tone)} />
                                            </TableCell>
                                            <TableCell>
                                                {trade.status === "PENDING" ? (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        disabled={cancelingTradeId === trade.id}
                                                        onClick={() => onCancel(trade)}
                                                    >
                                                        {cancelingTradeId === trade.id ? "İptal..." : "İptal"}
                                                    </Button>
                                                ) : (
                                                    <Typography variant="caption" color="text.disabled">-</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            {page.totalElements} kayıt · Sayfa {page.number + 1}/{Math.max(page.totalPages, 1)}
                        </Typography>
                        <Pagination
                            count={page.totalPages}
                            page={page.number + 1}
                            onChange={(_, value) => onPageChange(value - 1)}
                            size="small"
                            shape="rounded"
                        />
                    </Stack>
                </>
            ) : null}
        </Box>
    );
}
