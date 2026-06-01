import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { ViopContractPriceResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import {
    formatCompactMoney,
    formatCompactNumber,
    formatLocalDate,
    formatLocalDateTime,
    formatMoney,
    formatPercent,
    formatSignedNumber,
} from "../utils/marketFormatters";

type Props = {
    rows: ViopContractPriceResponse[];
    sortConfig: MarketSortState["viop"];
    onSort: (key: MarketSortKey) => void;
};

export function ViopTable({ rows, sortConfig, onSort }: Props) {
    const { t } = useTranslation();
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const COLUMNS: GridColDef<ViopContractPriceResponse>[] = [
        {
            field: "contract",
            headerName: t("market.tables.viop.contract"),
            flex: 1.3,
            minWidth: 150,
            renderCell: ({ row }) => (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.contractName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {formatLocalDateTime(row.fetchedAt)}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "segment",
            headerName: t("market.tables.viop.segment"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => row.marketSegment ?? "-",
        },
        {
            field: "underlying",
            headerName: t("market.tables.viop.underlying"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => row.underlyingSymbol ?? "-",
        },
        {
            field: "maturity",
            headerName: t("market.tables.viop.maturity"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => row.maturityText ?? "-",
        },
        {
            field: "price",
            headerName: t("market.tables.viop.lastPrice"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatMoney(row.lastPrice, "TRY", 2),
        },
        {
            field: "change",
            headerName: t("market.tables.viop.change"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => {
                const isDown = row.changePercent != null && row.changePercent < 0;
                return (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, color: isDown ? "error.main" : "success.main" }}>
                        <Typography component="strong" variant="body2" sx={{ fontWeight: 700, color: "inherit", lineHeight: 1.3 }}>
                            {formatPercent(row.changePercent)}
                        </Typography>
                        <Typography component="span" variant="caption" sx={{ color: "inherit", lineHeight: 1.3 }}>
                            {formatSignedNumber(row.changeAmount, 2)}
                        </Typography>
                    </Box>
                );
            },
        },
        {
            field: "volumeTry",
            headerName: t("market.tables.viop.volume"),
            flex: 1,
            minWidth: 110,
            renderCell: ({ row }) => formatCompactMoney(row.volumeTry, "TRY"),
        },
        {
            field: "quantity",
            headerName: t("market.tables.viop.quantity"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => formatCompactNumber(row.volumeQuantity),
        },
        {
            field: "date",
            headerName: t("market.tables.viop.date"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatLocalDate(row.tradeDate),
        },
    ];

    const handleSortChange = (model: GridSortModel) => {
        const item = model[0];
        if (item?.field) onSort(item.field as MarketSortKey);
    };

    return (
        <AppDataGrid<ViopContractPriceResponse>
            rows={rows}
            columns={COLUMNS}
            getRowId={(row) => row.id}
            sortModel={sortModel}
            onSortModelChange={handleSortChange}
            emptyMessage={t("market.tables.viop.empty")}
            rowHeight={52}
        />
    );
}
