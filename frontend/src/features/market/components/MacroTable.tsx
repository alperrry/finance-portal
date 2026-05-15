import { Box, Chip, Typography } from "@mui/material";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid";
import { AppDataGrid } from "../../../components/ui/AppDataGrid";
import type { MacroObservationResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import { formatLocalDate, formatNumber, formatPercent } from "../utils/marketFormatters";

type Props = {
    rows: MacroObservationResponse[];
    sortConfig: MarketSortState["macro"];
    onSort: (key: MarketSortKey) => void;
};

const typeLabel = (dataType: string) => {
    if (dataType === "INFLATION") return "TÜFE";
    if (dataType === "DEPOSIT_RATE") return "Mevduat";
    return dataType;
};

const formatMacroValue = (row: MacroObservationResponse) => {
    if (row.value == null) return "-";
    const value = row.dataType === "DEPOSIT_RATE" ? `%${formatNumber(row.value, 2)}` : formatNumber(row.value, 2);
    return row.dataType === "DEPOSIT_RATE" || !row.unit ? value : `${value} ${row.unit}`;
};

const COLUMNS: GridColDef<MacroObservationResponse>[] = [
    {
        field: "series",
        headerName: "Seri",
        flex: 1.4,
        minWidth: 160,
        renderCell: ({ row }) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{row.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{row.seriesCode}</Typography>
            </Box>
        ),
    },
    {
        field: "dataType",
        headerName: "Tip",
        flex: 0.8,
        minWidth: 100,
        renderCell: ({ row }) => (
            <Chip size="small" variant="outlined" label={typeLabel(row.dataType)} />
        ),
    },
    {
        field: "value",
        headerName: "Değer",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatMacroValue(row),
    },
    {
        field: "monthlyChange",
        headerName: "Aylık Değişim",
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }) => formatPercent(row.monthlyChangePercent),
    },
    {
        field: "annualChange",
        headerName: "Yıllık Değişim",
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }) => {
            const isDown = row.annualChangePercent != null && row.annualChangePercent < 0;
            return (
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: isDown ? "error.main" : "success.main" }}
                >
                    {formatPercent(row.annualChangePercent)}
                </Typography>
            );
        },
    },
    {
        field: "date",
        headerName: "Tarih",
        flex: 0.9,
        minWidth: 100,
        renderCell: ({ row }) => formatLocalDate(row.date),
    },
];

export function MacroTable({ rows, sortConfig, onSort }: Props) {
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const handleSortChange = (model: GridSortModel) => {
        const item = model[0];
        if (item?.field) onSort(item.field as MarketSortKey);
    };

    return (
        <AppDataGrid<MacroObservationResponse>
            rows={rows}
            columns={COLUMNS}
            getRowId={(row) => `${row.seriesCode}-${row.date}`}
            sortModel={sortModel}
            onSortModelChange={handleSortChange}
            emptyMessage="Aramaya uyan makro veri kaydı yok."
            rowHeight={52}
        />
    );
}
