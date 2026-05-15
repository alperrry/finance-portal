import { Box, Typography } from "@mui/material";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { FxResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import { formatRate, formatLocalDate, formatUnitLabel } from "../utils/marketFormatters";
import { getFxSpread } from "../utils/marketSorters";

type Props = {
    rows: FxResponse[];
    sortConfig: MarketSortState["fx"];
    onSort: (key: MarketSortKey) => void;
    onRowClick: (code: string) => void;
};

const COLUMNS: GridColDef<FxResponse>[] = [
    {
        field: "pair",
        headerName: "Parite",
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {formatUnitLabel(row.unit, row.currencyCode)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>TRY</Typography>
            </Box>
        ),
    },
    {
        field: "name",
        headerName: "Ad",
        flex: 1.4,
        minWidth: 140,
        renderCell: ({ row }) => row.currencyName,
    },
    {
        field: "buying",
        headerName: "Alış",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatRate(row.forexBuying),
    },
    {
        field: "selling",
        headerName: "Satış",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatRate(row.forexSelling),
    },
    {
        field: "efektifBuying",
        headerName: "Efektif Alış",
        flex: 0.9,
        minWidth: 110,
        renderCell: ({ row }) => formatRate(row.banknoteBuying),
    },
    {
        field: "efektifSelling",
        headerName: "Efektif Satış",
        flex: 0.9,
        minWidth: 110,
        renderCell: ({ row }) => formatRate(row.banknoteSelling),
    },
    {
        field: "spread",
        headerName: "Makas",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatRate(getFxSpread(row)),
    },
    {
        field: "date",
        headerName: "Tarih",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatLocalDate(row.rateDate),
    },
];

export function FxTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const handleSortChange = (model: GridSortModel) => {
        const item = model[0];
        if (item?.field) onSort(item.field as MarketSortKey);
    };

    return (
        <AppDataGrid<FxResponse>
            rows={rows}
            columns={COLUMNS}
            getRowId={(row) => row.currencyCode}
            onRowClick={(row) => onRowClick(row.currencyCode)}
            sortModel={sortModel}
            onSortModelChange={handleSortChange}
            emptyMessage="Aramaya uyan döviz kaydı yok."
            rowHeight={52}
        />
    );
}
