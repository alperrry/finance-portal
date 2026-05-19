import { Box, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { BondResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import { formatNumber, formatWholeNumber, formatLocalDate } from "../utils/marketFormatters";

type Props = {
    rows: BondResponse[];
    sortConfig: MarketSortState["bonds"];
    onSort: (key: MarketSortKey) => void;
    onRowClick: (code: string) => void;
};

const COLUMNS: GridColDef<BondResponse>[] = [
    {
        field: "instrument",
        headerName: "Enstrüman",
        flex: 1.4,
        minWidth: 160,
        renderCell: ({ row }) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{row.evdsSeriesCode}</Typography>
            </Box>
        ),
    },
    {
        field: "type",
        headerName: "Tip",
        flex: 0.8,
        minWidth: 90,
        renderCell: ({ row }) => row.bondType ?? "-",
    },
    {
        field: "maturity",
        headerName: "Vade",
        flex: 0.8,
        minWidth: 90,
        renderCell: ({ row }) =>
            row.maturityDays != null ? `${formatWholeNumber(row.maturityDays)} gün` : "-",
    },
    {
        field: "interest",
        headerName: "Faiz",
        flex: 0.8,
        minWidth: 90,
        renderCell: ({ row }) =>
            row.interestRate != null ? `%${formatNumber(row.interestRate, 2)}` : "-",
    },
    {
        field: "compounded",
        headerName: "Bileşik",
        flex: 0.8,
        minWidth: 90,
        renderHeader: () => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <span>Bileşik</span>
                <Tooltip
                    title="Kupon ödemelerinin aynı faiz oranıyla tekrar yatırıma yönlendirildiği varsayılarak hesaplanmış bileşik getiridir."
                    arrow
                >
                    <InfoOutlinedIcon sx={{ fontSize: "0.85rem", color: "text.secondary", cursor: "help" }} />
                </Tooltip>
            </Box>
        ),
        renderCell: ({ row }) =>
            row.compoundedRate != null ? `%${formatNumber(row.compoundedRate, 2)}` : "-",
    },
    {
        field: "currency",
        headerName: "Para Birimi",
        flex: 0.8,
        minWidth: 90,
        renderCell: ({ row }) => row.currency ?? "-",
    },
    {
        field: "date",
        headerName: "Tarih",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatLocalDate(row.rateDate),
    },
];

export function BondsTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const handleSortChange = (model: GridSortModel) => {
        const item = model[0];
        if (item?.field) onSort(item.field as MarketSortKey);
    };

    return (
        <AppDataGrid<BondResponse>
            rows={rows}
            columns={COLUMNS}
            getRowId={(row) => row.evdsSeriesCode}
            onRowClick={(row) => onRowClick(row.evdsSeriesCode)}
            sortModel={sortModel}
            onSortModelChange={handleSortChange}
            emptyMessage="Aramaya uyan tahvil kaydı yok."
            rowHeight={52}
        />
    );
}
