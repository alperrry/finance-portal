import { Box, Chip, CircularProgress, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useMemo } from "react";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { ManualPositionResponse, PositionKind } from "../api/portfolioApi";
import { getInstrumentLabels } from "../types";
import { formatMoney, formatPercent, formatQuantity, formatSignedMoney } from "../utils/portfolioFormatters";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
    const openColumns: GridColDef<ManualPositionResponse>[] = useMemo(() => [
        {
            field: "instrument",
            headerName: t("portfolio.positions.cols.instrument"),
            flex: 1.2,
            minWidth: 130,
            renderCell: ({ row }) => (
                <Box sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {row.instrumentSymbol ?? (row.bankName ?? getInstrumentLabels()[row.instrumentType])}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {row.instrumentName ?? getInstrumentLabels()[row.instrumentType]}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "direction",
            headerName: t("portfolio.positions.cols.direction"),
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
            headerName: t("portfolio.positions.cols.quantity"),
            flex: 0.7,
            minWidth: 80,
            renderCell: ({ row }) => formatQuantity(row.quantity),
        },
        {
            field: "entryPrice",
            headerName: t("portfolio.positions.cols.buyPrice"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatMoney(row.entryPrice, "TRY"),
        },
        {
            field: "currentPrice",
            headerName: t("portfolio.positions.cols.currentPrice"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) =>
                row.currentPrice !== null ? formatMoney(row.currentPrice, "TRY") : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                ),
        },
        {
            field: "unrealizedPnl",
            headerName: t("portfolio.positions.cols.unrealizedPnl"),
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
            headerName: t("portfolio.positions.cols.buyDate"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => (
                <Typography variant="body2">{row.entryDate ?? "—"}</Typography>
            ),
        },
        {
            field: "actions",
            headerName: t("portfolio.positions.cols.delete"),
            flex: 0.5,
            minWidth: 60,
            sortable: false,
            renderCell: ({ row }) => (
                <Tooltip title={t("portfolio.positions.deleteTooltip")}>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                        <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            ),
        },
    ], [onDelete, t]);

    const closedColumns: GridColDef<ManualPositionResponse>[] = useMemo(() => [
        {
            field: "instrument",
            headerName: t("portfolio.positions.cols.instrument"),
            flex: 1.2,
            minWidth: 130,
            renderCell: ({ row }) => (
                <Box sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {row.instrumentSymbol ?? (row.bankName ?? getInstrumentLabels()[row.instrumentType])}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {row.instrumentName ?? getInstrumentLabels()[row.instrumentType]}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "quantity",
            headerName: t("portfolio.positions.cols.quantity"),
            flex: 0.7,
            minWidth: 80,
            renderCell: ({ row }) => formatQuantity(row.quantity),
        },
        {
            field: "entryExitPrice",
            headerName: t("portfolio.positions.cols.buySell"),
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
            headerName: t("portfolio.positions.cols.realizedPnl"),
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
            headerName: t("portfolio.positions.cols.buySellDate"),
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
            headerName: t("portfolio.positions.cols.delete"),
            flex: 0.5,
            minWidth: 60,
            sortable: false,
            renderCell: ({ row }) => (
                <Tooltip title={t("portfolio.positions.deleteTooltip")}>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                        <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            ),
        },
    ], [onDelete, t]);

    const columns = kind === "OPEN" ? openColumns : closedColumns;

    return (
        <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("portfolio.positions.overline")}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{t("portfolio.positions.title")}</Typography>
                </Box>
            </Stack>

            <Tabs
                value={kind}
                onChange={(_, val: PositionKind) => onKindChange(val)}
                sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
                <Tab label={t("portfolio.positions.openTab")} value="OPEN" />
                <Tab label={t("portfolio.positions.closedTab")} value="CLOSED" />
            </Tabs>

            {loading && (
                <Stack sx={{ alignItems: "center", py: 3 }}>
                    <CircularProgress size={24} />
                </Stack>
            )}

            {!loading && positions.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    {kind === "OPEN" ? t("portfolio.positions.noOpen") : t("portfolio.positions.noClosed")}
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
