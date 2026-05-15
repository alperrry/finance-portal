import { Box, Typography } from "@mui/material";
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

const COLUMNS: GridColDef<FundResponse>[] = [
    {
        field: "fund",
        headerName: "Fon",
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
        headerName: "Tür",
        flex: 0.8,
        minWidth: 90,
        renderCell: ({ row }) => row.fundType ?? "-",
    },
    {
        field: "price",
        headerName: "Fiyat",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatMoney(row.price, "TRY", 4),
    },
    {
        field: "investors",
        headerName: "Yatırımcı",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatCompactNumber(row.investorCount),
    },
    {
        field: "portfolioSize",
        headerName: "Portföy Büyüklüğü",
        flex: 1.2,
        minWidth: 140,
        renderCell: ({ row }) => formatCompactMoney(row.portfolioSize, "TRY"),
    },
    {
        field: "shares",
        headerName: "Pay Adedi",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatCompactNumber(row.totalShares),
    },
    {
        field: "date",
        headerName: "Tarih",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatLocalDate(row.priceDate),
    },
];

export function FundsTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

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
            emptyMessage="Aramaya uyan fon kaydı yok."
            rowHeight={52}
        />
    );
}
