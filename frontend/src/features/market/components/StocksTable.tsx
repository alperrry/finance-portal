import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
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

export function StocksTable({ rows, stockDatasetIsEmpty, sortConfig, onSort, onRowClick }: Props) {
    const { t } = useTranslation();
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const COLUMNS: GridColDef<StockResponse>[] = [
        {
            field: "stock",
            headerName: t("market.tables.stock.name"),
            flex: 1.2,
            minWidth: 140,
            renderCell: ({ row }) => (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.symbol}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {row.shortName ?? row.longName ?? t("market.stock.label")}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "sector",
            headerName: t("market.tables.stock.sector"),
            flex: 1,
            minWidth: 110,
            renderCell: ({ row }) => row.sector ?? row.indexName ?? "-",
        },
        {
            field: "price",
            headerName: t("market.tables.stock.price"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatMoney(row.price, row.currency ?? "TRY"),
        },
        {
            field: "change",
            headerName: t("market.tables.stock.change"),
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
            headerName: t("market.tables.stock.volume"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => formatCompactNumber(row.volume),
        },
        {
            field: "marketCap",
            headerName: t("market.tables.stock.marketCap"),
            flex: 1,
            minWidth: 120,
            renderCell: ({ row }) => formatCompactMoney(row.marketCap, row.currency ?? "TRY"),
        },
        {
            field: "range52w",
            headerName: t("market.tables.stock.range52w"),
            flex: 1.2,
            minWidth: 140,
            renderCell: ({ row }) =>
                row.fiftyTwoWeekLow != null && row.fiftyTwoWeekHigh != null
                    ? `${formatMoney(row.fiftyTwoWeekLow, row.currency ?? "TRY")} / ${formatMoney(row.fiftyTwoWeekHigh, row.currency ?? "TRY")}`
                    : "-",
        },
        {
            field: "fetchedAt",
            headerName: t("market.tables.stock.dataDate"),
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
            emptyMessage={t("market.tables.stock.empty")}
            emptySubMessage={t("market.tables.stock.emptyNote")}
            rowHeight={52}
        />
    );
}
