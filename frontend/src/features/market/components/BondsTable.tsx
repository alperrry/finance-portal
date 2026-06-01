import { Box, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
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

export function BondsTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    const { t } = useTranslation();
    const sortModel: GridSortModel = [{ field: sortConfig.key, sort: sortConfig.direction }];

    const COLUMNS: GridColDef<BondResponse>[] = [
        {
            field: "instrument",
            headerName: t("market.tables.bond.instrument"),
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
            headerName: t("market.tables.bond.type"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => row.bondType ?? "-",
        },
        {
            field: "maturity",
            headerName: t("market.tables.bond.maturity"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) =>
                row.maturityDays != null ? `${formatWholeNumber(row.maturityDays)} ${t("market.tables.bond.days")}` : "-",
        },
        {
            field: "interest",
            headerName: t("market.tables.bond.interest"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) =>
                row.interestRate != null ? `%${formatNumber(row.interestRate, 2)}` : "-",
        },
        {
            field: "compounded",
            headerName: t("market.tables.bond.compound"),
            flex: 0.8,
            minWidth: 90,
            renderHeader: () => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <span>{t("market.tables.bond.compound")}</span>
                    <Tooltip title={t("market.tables.bond.compoundTooltip")} arrow>
                        <InfoOutlinedIcon sx={{ fontSize: "0.85rem", color: "text.secondary", cursor: "help" }} />
                    </Tooltip>
                </Box>
            ),
            renderCell: ({ row }) =>
                row.compoundedRate != null ? `%${formatNumber(row.compoundedRate, 2)}` : "-",
        },
        {
            field: "currency",
            headerName: t("market.tables.bond.currency"),
            flex: 0.8,
            minWidth: 90,
            renderCell: ({ row }) => row.currency ?? "-",
        },
        {
            field: "date",
            headerName: t("market.tables.bond.date"),
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
        <AppDataGrid<BondResponse>
            rows={rows}
            columns={COLUMNS}
            getRowId={(row) => row.evdsSeriesCode}
            onRowClick={(row) => onRowClick(row.evdsSeriesCode)}
            sortModel={sortModel}
            onSortModelChange={handleSortChange}
            emptyMessage={t("market.tables.bond.empty")}
            rowHeight={52}
        />
    );
}
