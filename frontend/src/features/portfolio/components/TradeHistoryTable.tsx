import { Box, Chip, CircularProgress, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useMemo } from "react";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { ManualPositionResponse, PositionKind } from "../api/portfolioApi";
import { INSTRUMENT_LABELS } from "../types";
import { formatMoney, formatPercent, formatQuantity, formatSignedMoney } from "../utils/portfolioFormatters";

type Props = {
    portfolioId: number;
    positions: ManualPositionResponse[];
    loading: boolean;
    kind: PositionKind;
    onKindChange: (kind: PositionKind) => void;
    onDelete: (positionId: number) => void;
};

function pnlColor(value: number | null | undefined): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (value > 0) return "success.main";
    if (value < 0) return "error.main";
    return undefined;
}

export function TradeHistoryTable({ positions, loading, kind, onKindChange, onDelete }: Props) {
    const openColumns: GridColDef<ManualPositionResponse>[] = useMemo(() => [
        {
            field: "instrument",
            headerName: "Enstrüman",
            flex: 1.2,
            minWidth: 130,
            renderCell: ({ row }) => (
                <Box sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {row.instrumentSymbol ?? (row.bankName ?? INSTRUMENT_LABELS[row.instrumentType])}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {row.instrumentName ?? INSTRUMENT_LABELS[row.instrumentType]}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "direction",
            headerName: "Yön",
            flex: 0.7,
            minWidth: 80,
            renderCell: ({ row }) =>
                row.instrumentType === "VIOP" ? (
                    <Chip
                        label={row.direction === "LONG" ? "Long" : "Short"}
                        size="small"
                        color={row.direction === "LONG" ? "success" : "error"}
                        variant="outlined"
                    />
                ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                ),
        },
        {
            field: "quantity",
            headerName: "Miktar",
            flex: 0.7,
            minWidth: 80,
            renderCell: ({ row }) => formatQuantity(row.quantity),
        },
        {
            field: "entryPrice",
            headerName: "Alış Fiyatı",
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatMoney(row.entryPrice, "TRY"),
        },
        {
            field: "currentPrice",
            headerName: "Anlık Fiyat",
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) =>
                row.currentPrice !== null ? formatMoney(row.currentPrice, "TRY") : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                ),
        },
        {
            field: "unrealizedPnl",
            headerName: "Gerç. Dışı K/Z",
            flex: 1,
            minWidth: 120,
            renderCell: ({ row }) => (
                <Typography variant="body2" sx={{ color: pnlColor(row.unrealizedPnl), fontWeight: 600 }}>
                    {formatSignedMoney(row.unrealizedPnl, "TRY")}
                </Typography>
            ),
        },
        {
            field: "pnlPercent",
            headerName: "P&L %",
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => (
                <Typography variant="body2" sx={{ color: pnlColor(row.pnlPercent), fontWeight: 600 }}>
                    {formatPercent(row.pnlPercent)}
                </Typography>
            ),
        },
        {
            field: "entryDate",
            headerName: "Alım Tarihi",
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => (
                <Typography variant="body2">{row.entryDate ?? "—"}</Typography>
            ),
        },
        {
            field: "actions",
            headerName: "Sil",
            flex: 0.5,
            minWidth: 60,
            sortable: false,
            renderCell: ({ row }) => (
                <Tooltip title="Pozisyonu sil">
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                        <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            ),
        },
    ], [onDelete]);

    const closedColumns: GridColDef<ManualPositionResponse>[] = useMemo(() => [
        {
            field: "instrument",
            headerName: "Enstrüman",
            flex: 1.2,
            minWidth: 130,
            renderCell: ({ row }) => (
                <Box sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {row.instrumentSymbol ?? (row.bankName ?? INSTRUMENT_LABELS[row.instrumentType])}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {row.instrumentName ?? INSTRUMENT_LABELS[row.instrumentType]}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "quantity",
            headerName: "Miktar",
            flex: 0.7,
            minWidth: 80,
            renderCell: ({ row }) => formatQuantity(row.quantity),
        },
        {
            field: "entryExitPrice",
            headerName: "Alış / Satış",
            flex: 1.1,
            minWidth: 120,
            renderCell: ({ row }) => (
                <Typography variant="body2">
                    {formatMoney(row.entryPrice, "TRY")} / {formatMoney(row.exitPrice, "TRY")}
                </Typography>
            ),
        },
        {
            field: "realizedPnl",
            headerName: "Gerçekleşen K/Z",
            flex: 1,
            minWidth: 120,
            renderCell: ({ row }) => (
                <Typography variant="body2" sx={{ color: pnlColor(row.realizedPnl), fontWeight: 600 }}>
                    {formatSignedMoney(row.realizedPnl, "TRY")}
                </Typography>
            ),
        },
        {
            field: "pnlPercent",
            headerName: "P&L %",
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => (
                <Typography variant="body2" sx={{ color: pnlColor(row.pnlPercent), fontWeight: 600 }}>
                    {formatPercent(row.pnlPercent)}
                </Typography>
            ),
        },
        {
            field: "dates",
            headerName: "Alım — Satım",
            flex: 1.2,
            minWidth: 140,
            renderCell: ({ row }) => (
                <Typography variant="body2">
                    {row.entryDate ?? "—"} — {row.exitDate ?? "—"}
                </Typography>
            ),
        },
        {
            field: "actions",
            headerName: "Sil",
            flex: 0.5,
            minWidth: 60,
            sortable: false,
            renderCell: ({ row }) => (
                <Tooltip title="Pozisyonu sil">
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                        <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            ),
        },
    ], [onDelete]);

    const columns = kind === "OPEN" ? openColumns : closedColumns;

    return (
        <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Pozisyonlar</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Pozisyon Defteri</Typography>
                </Box>
            </Stack>

            <Tabs
                value={kind}
                onChange={(_, val: PositionKind) => onKindChange(val)}
                sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
                <Tab label="Mevcut Pozisyonlar" value="OPEN" />
                <Tab label="Geçmiş Pozisyonlar" value="CLOSED" />
            </Tabs>

            {loading && (
                <Stack sx={{ alignItems: "center", py: 3 }}>
                    <CircularProgress size={24} />
                </Stack>
            )}

            {!loading && positions.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    {kind === "OPEN" ? "Mevcut pozisyon yok." : "Geçmiş pozisyon yok."}
                </Typography>
            )}

            {!loading && positions.length > 0 && (
                <AppDataGrid<ManualPositionResponse>
                    rows={positions}
                    columns={columns}
                    getRowId={(row) => row.id}
                    autoHeight
                    rowHeight={52}
                    sx={{ mt: 0 }}
                />
            )}
        </Box>
    );
}
