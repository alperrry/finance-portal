import { Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Pagination, Select, Stack, TextField, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useMemo } from "react";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
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

    const columns: GridColDef<TradeResponse>[] = useMemo(() => [
        {
            field: "createdAt",
            headerName: "Tarih",
            flex: 1,
            minWidth: 120,
            renderCell: ({ row }) => (
                <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>{formatDateTime(row.createdAt)}</Typography>
            ),
        },
        {
            field: "instrument",
            headerName: "Enstrüman",
            flex: 1.2,
            minWidth: 130,
            renderCell: ({ row }) => (
                <Box sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.instrumentSymbol || "Bilinmiyor"}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {row.instrumentName || INSTRUMENT_LABELS[row.instrumentType]}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "transactionType",
            headerName: "Tip",
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => (
                <Chip
                    label={`${row.transactionType === "BUY" ? "↘ " : "↗ "}${TRANSACTION_LABELS[row.transactionType]}`}
                    size="small"
                    color={row.transactionType === "BUY" ? "success" : "error"}
                    variant="outlined"
                />
            ),
        },
        {
            field: "orderType",
            headerName: "Emir",
            flex: 0.7,
            minWidth: 80,
            renderCell: ({ row }) => ORDER_LABELS[row.orderType ?? "LIMIT"],
        },
        {
            field: "quantity",
            headerName: "Miktar",
            flex: 0.7,
            minWidth: 80,
            renderCell: ({ row }) => formatQuantity(row.quantity),
        },
        {
            field: "targetPrice",
            headerName: "Hedef",
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => formatNumber(row.targetPrice, 4),
        },
        {
            field: "executedPrice",
            headerName: "Gerçekleşme",
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatNumber(row.executedPrice, 4),
        },
        {
            field: "totalAmount",
            headerName: "Tutar",
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatMoney(row.totalAmount, displayCurrency),
        },
        {
            field: "status",
            headerName: "Durum",
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => (
                <Chip label={STATUS_LABELS[row.status]} size="small" color={statusColor(statusTone(row.status))} />
            ),
        },
        {
            field: "actions",
            headerName: "Aksiyon",
            flex: 0.8,
            minWidth: 90,
            sortable: false,
            renderCell: ({ row }) =>
                row.status === "PENDING" ? (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={cancelingTradeId === row.id}
                        onClick={() => onCancel(row)}
                    >
                        {cancelingTradeId === row.id ? "İptal..." : "İptal"}
                    </Button>
                ) : (
                    <Typography variant="caption" color="text.disabled">-</Typography>
                ),
        },
    ], [displayCurrency, cancelingTradeId, onCancel]);

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
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Bu filtrede işlem yok.
                </Typography>
            ) : null}

            {!state.loading && !state.error && page && trades.length > 0 ? (
                <>
                    <AppDataGrid<TradeResponse>
                        rows={trades}
                        columns={columns}
                        getRowId={(row) => row.id}
                        autoHeight
                        rowHeight={52}
                        sx={{ mt: 0 }}
                    />
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
