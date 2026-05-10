import type { KeyboardEvent } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import type { BondResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import { formatNumber, formatWholeNumber, formatLocalDate } from "../utils/marketFormatters";

type Props = {
    rows: BondResponse[];
    sortConfig: MarketSortState["bonds"];
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

export function BondsTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    if (rows.length === 0) {
        return (
            <Box sx={EMPTY_SX}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Aramaya uyan tahvil kaydi yok.</Typography>
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
            <Table sx={{ minWidth: 880 }} stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>{col("instrument", "Enstrüman")}</TableCell>
                        <TableCell>{col("type", "Tip")}</TableCell>
                        <TableCell>{col("maturity", "Vade")}</TableCell>
                        <TableCell>{col("interest", "Faiz")}</TableCell>
                        <TableCell>{col("compounded", "Bileşik")}</TableCell>
                        <TableCell>{col("currency", "Para Birimi")}</TableCell>
                        <TableCell>{col("date", "Tarih")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow
                            key={row.evdsSeriesCode}
                            hover
                            tabIndex={0}
                            role="button"
                            onClick={() => onRowClick(row.evdsSeriesCode)}
                            onKeyDown={(e) => handleKeyDown(e, row.evdsSeriesCode)}
                            sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                        >
                            <TableCell>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{row.evdsSeriesCode}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell>{row.bondType ?? "-"}</TableCell>
                            <TableCell>{row.maturityDays != null ? `${formatWholeNumber(row.maturityDays)} gun` : "-"}</TableCell>
                            <TableCell>{row.interestRate != null ? `%${formatNumber(row.interestRate, 2)}` : "-"}</TableCell>
                            <TableCell>{row.compoundedRate != null ? `%${formatNumber(row.compoundedRate, 2)}` : "-"}</TableCell>
                            <TableCell>{row.currency ?? "-"}</TableCell>
                            <TableCell>{formatLocalDate(row.rateDate)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
