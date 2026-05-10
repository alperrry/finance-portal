import type { KeyboardEvent } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import type { FundResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import { formatMoney, formatCompactNumber, formatCompactMoney, formatLocalDate } from "../utils/marketFormatters";

type Props = {
    rows: FundResponse[];
    sortConfig: MarketSortState["funds"];
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

export function FundsTable({ rows, sortConfig, onSort, onRowClick }: Props) {
    if (rows.length === 0) {
        return (
            <Box sx={EMPTY_SX}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Aramaya uyan fon kaydi yok.</Typography>
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
            <Table sx={{ minWidth: 920 }} stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>{col("fund", "Fon")}</TableCell>
                        <TableCell>{col("type", "Tür")}</TableCell>
                        <TableCell>{col("price", "Fiyat")}</TableCell>
                        <TableCell>{col("investors", "Yatırımcı")}</TableCell>
                        <TableCell>{col("portfolioSize", "Portföy Büyüklüğü")}</TableCell>
                        <TableCell>{col("shares", "Pay Adedi")}</TableCell>
                        <TableCell>{col("date", "Tarih")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow
                            key={row.code}
                            hover
                            tabIndex={0}
                            role="button"
                            onClick={() => onRowClick(row.code)}
                            onKeyDown={(e) => handleKeyDown(e, row.code)}
                            sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                        >
                            <TableCell>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.code}</Typography>
                                    <Typography variant="caption" color="text.secondary">{row.name}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell>{row.fundType ?? "-"}</TableCell>
                            <TableCell>{formatMoney(row.price, "TRY", 4)}</TableCell>
                            <TableCell>{formatCompactNumber(row.investorCount)}</TableCell>
                            <TableCell>{formatCompactMoney(row.portfolioSize, "TRY")}</TableCell>
                            <TableCell>{formatCompactNumber(row.totalShares)}</TableCell>
                            <TableCell>{formatLocalDate(row.priceDate)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
