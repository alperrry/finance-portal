import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { FundResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import { formatMoney, formatCompactNumber, formatCompactMoney, formatLocalDate } from "../utils/marketFormatters";

type Props = {
    rows: FundResponse[];
    sortConfig: MarketSortState["funds"];
    onSort: (key: MarketSortKey) => void;
    onRowClick: (code: string) => void;
};

export function FundsTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    const { t } = useTranslation();
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const COLUMNS: GridColDef<FundResponse>[] = [
        {
            field: "fund",
            headerName: t("market.tables.fund.fund"),
            flex: 1.4,
            minWidth: 160,
            renderCell: ({ row }) => (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.code}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{row.name}</Typography>
                </Box>
            ),
        },
        {
            field: "type",
            headerName: t("market.tables.fund.type"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => row.fundType ?? "-",
        },
        {
            field: "price",
            headerName: t("market.tables.fund.price"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatMoney(row.price, "TRY", 4),
        },
        {
            field: "investors",
            headerName: t("market.tables.fund.investors"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatCompactNumber(row.investorCount),
        },
        {
            field: "portfolioSize",
            headerName: t("market.tables.fund.portfolioSize"),
            flex: 1.2,
            minWidth: 140,
            renderCell: ({ row }) => formatCompactMoney(row.portfolioSize, "TRY"),
        },
        {
            field: "shares",
            headerName: t("market.tables.fund.shares"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatCompactNumber(row.totalShares),
        },
        {
            field: "date",
            headerName: t("market.tables.fund.date"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatLocalDate(row.priceDate),
        },
    ];

    const handleSortChange = (model: GridSortModel) => {
        const item = model[0];
        if (item?.field) onSort(item.field as MarketSortKey);
    };

    return (
        <AppDataGrid<FundResponse>
            rows={rows}
            columns={COLUMNS}
            getRowId={(row) => row.code}
            onRowClick={(row) => onRowClick(row.code)}
            sortModel={sortModel}
            onSortModelChange={handleSortChange}
            emptyMessage={t("market.tables.fund.empty")}
            rowHeight={52}
        />
    );
}
