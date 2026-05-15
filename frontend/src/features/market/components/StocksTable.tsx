import { Box, Typography } from "@mui/material";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { StockResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import {
    formatMoney,
    formatPercent,
    formatSignedNumber,
    formatCompactNumber,
    formatCompactMoney,
    formatLocalDate,
    formatLocalDateTime,
    toSafeNumber,
} from "../utils/marketFormatters";

type Props = {
    rows: StockResponse[];
    stockDatasetIsEmpty: boolean;
    sortConfig: MarketSortState["stocks"];
    onSort: (key: MarketSortKey) => void;
    onRowClick: (symbol: string) => void;
};

const COLUMNS: GridColDef<StockResponse>[] = [
    {
        field: "stock",
        headerName: "Hisse",
        flex: 1.2,
        minWidth: 140,
        renderCell: ({ row }) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.symbol}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                    {row.shortName ?? row.longName ?? "Hisse"}
                </Typography>
            </Box>
        ),
    },
    {
        field: "sector",
        headerName: "Sektör",
        flex: 1,
        minWidth: 110,
        renderCell: ({ row }) => row.sector ?? row.indexName ?? "-",
    },
    {
        field: "price",
        headerName: "Fiyat",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatMoney(row.price, row.currency ?? "TRY"),
    },
    {
        field: "change",
        headerName: "Değişim",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => {
            const isDown = toSafeNumber(row.changePercent) !== null && (row.changePercent ?? 0) < 0;
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, color: isDown ? "error.main" : "success.main" }}>
                    <Typography component="strong" variant="body2" sx={{ fontWeight: 700, color: "inherit", lineHeight: 1.3 }}>
                        {formatPercent(row.changePercent)}
                    </Typography>
                    <Typography component="span" variant="caption" sx={{ color: "inherit", lineHeight: 1.3 }}>
                        {formatSignedNumber(row.change, 2)}
                    </Typography>
                </Box>
            );
        },
    },
    {
        field: "volume",
        headerName: "Hacim",
        flex: 0.8,
        minWidth: 90,
        renderCell: ({ row }) => formatCompactNumber(row.volume),
    },
    {
        field: "marketCap",
        headerName: "Piyasa Değeri",
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }) => formatCompactMoney(row.marketCap, row.currency ?? "TRY"),
    },
    {
        field: "range52w",
        headerName: "52H Aralık",
        flex: 1.2,
        minWidth: 140,
        renderCell: ({ row }) =>
            row.fiftyTwoWeekLow != null && row.fiftyTwoWeekHigh != null
                ? `${formatMoney(row.fiftyTwoWeekLow, row.currency ?? "TRY")} / ${formatMoney(row.fiftyTwoWeekHigh, row.currency ?? "TRY")}`
                : "-",
    },
    {
        field: "fetchedAt",
        headerName: "Veri Tarihi",
        flex: 1,
        minWidth: 110,
        renderCell: ({ row }) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{formatLocalDate(row.tradeDate)}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{formatLocalDateTime(row.fetchedAt)}</Typography>
            </Box>
        ),
    },
];

export function StocksTable({ rows, stockDatasetIsEmpty, sortConfig, onSort, onRowClick }: Props) {
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const handleSortChange = (model: GridSortModel) => {
        const item = model[0];
        if (item?.field) onSort(item.field as MarketSortKey);
    };

    return (
        <AppDataGrid<StockResponse>
            rows={rows}
            columns={COLUMNS}
            getRowId={(row) => row.symbol}
            onRowClick={(row) => onRowClick(row.symbol)}
            sortModel={sortModel}
            onSortModelChange={handleSortChange}
            isEmpty={stockDatasetIsEmpty}
            emptyMessage="Hisse listesi şu an boş."
            emptySubMessage="Günlük kapanış verisi henüz yazılmadıysa veya tatil günlerinde liste boş dönebilir."
            rowHeight={52}
        />
    );
}
