import type { KeyboardEvent } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
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

const EMPTY_SX = {
    borderRadius: 2.5,
    p: 2.25,
    bgcolor: "rgba(247, 245, 241, 0.9)",
    border: "1px solid",
    borderColor: "divider",
    mt: 2,
};

export function FxTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    if (rows.length === 0) {
        return (
            <Box sx={EMPTY_SX}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Aramaya uyan doviz kaydi yok.</Typography>
                <Typography variant="caption" color="text.secondary">Filtreyi temizleyip tekrar deneyin.</Typography>
            </Box>
        );
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, code: string) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onRowClick(code);
    };

    const col = (key: MarketSortKey, label: string) => (
        <TableSortLabel
            active={sortConfig.key === key}
            direction={sortConfig.key === key ? sortConfig.direction : "asc"}
            onClick={() => onSort(key)}
        >
            {label}
        </TableSortLabel>
    );

    return (
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5, mt: 2 }}>
            <Table sx={{ minWidth: 760 }} stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>{col("pair", "Parite")}</TableCell>
                        <TableCell>{col("name", "Ad")}</TableCell>
                        <TableCell>{col("buying", "Alış")}</TableCell>
                        <TableCell>{col("selling", "Satış")}</TableCell>
                        <TableCell>{col("spread", "Makas")}</TableCell>
                        <TableCell>{col("date", "Tarih")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow
                            key={row.currencyCode}
                            hover
                            tabIndex={0}
                            role="button"
                            onClick={() => onRowClick(row.currencyCode)}
                            onKeyDown={(e) => handleKeyDown(e, row.currencyCode)}
                            sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                        >
                            <TableCell>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatUnitLabel(row.unit, row.currencyCode)}</Typography>
                                    <Typography variant="caption" color="text.secondary">TRY</Typography>
                                </Box>
                            </TableCell>
                            <TableCell>{row.currencyName}</TableCell>
                            <TableCell>{formatRate(row.forexBuying)}</TableCell>
                            <TableCell>{formatRate(row.forexSelling)}</TableCell>
                            <TableCell>{formatRate(getFxSpread(row))}</TableCell>
                            <TableCell>{formatLocalDate(row.rateDate)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
