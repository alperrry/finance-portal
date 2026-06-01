import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
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

export function FxTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    const { t } = useTranslation();
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const COLUMNS: GridColDef<FxResponse>[] = [
        {
            field: "pair",
            headerName: t("market.tables.fx.pair"),
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
            headerName: t("market.tables.fx.name"),
            flex: 1.4,
            minWidth: 140,
            renderCell: ({ row }) => row.currencyName,
        },
        {
            field: "buying",
            headerName: t("market.tables.fx.buy"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatRate(row.forexBuying),
        },
        {
            field: "selling",
            headerName: t("market.tables.fx.sell"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatRate(row.forexSelling),
        },
        {
            field: "efektifBuying",
            headerName: t("market.tables.fx.effectiveBuy"),
            flex: 0.9,
            minWidth: 110,
            renderCell: ({ row }) => formatRate(row.banknoteBuying),
        },
        {
            field: "efektifSelling",
            headerName: t("market.tables.fx.effectiveSell"),
            flex: 0.9,
            minWidth: 110,
            renderCell: ({ row }) => formatRate(row.banknoteSelling),
        },
        {
            field: "spread",
            headerName: t("market.tables.fx.spread"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatRate(getFxSpread(row)),
        },
        {
            field: "date",
            headerName: t("market.tables.fx.date"),
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row }) => formatLocalDate(row.rateDate),
        },
    ];

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
            emptyMessage={t("market.tables.fx.empty")}
            rowHeight={52}
        />
    );
}
