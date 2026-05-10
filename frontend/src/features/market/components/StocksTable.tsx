import type { KeyboardEvent } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import type { StockResponse } from "../api/marketApi";
import type { MarketSortKey, MarketSortState } from "../types";
import {
    toSafeNumber,
    formatMoney,
    formatPercent,
    formatSignedNumber,
    formatCompactNumber,
    formatCompactMoney,
    formatLocalDate,
    formatLocalDateTime,
} from "../utils/marketFormatters";

type Props = {
    rows: StockResponse[];
    stockDatasetIsEmpty: boolean;
    sortConfig: MarketSortState["stocks"];
    onSort: (key: MarketSortKey) => void;
    onRowClick: (symbol: string) => void;
};

const EMPTY_SX = {
    borderRadius: 2.5,
    p: 2.25,
    bgcolor: "rgba(247, 245, 241, 0.9)",
    border: "1px solid",
    borderColor: "divider",
    mt: 2,
};

export function StocksTable({ rows, stockDatasetIsEmpty, sortConfig, onSort, onRowClick }: Props) {
    if (stockDatasetIsEmpty) {
        return (
            <Box sx={EMPTY_SX}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Hisse listesi su an bos.</Typography>
                <Typography variant="caption" color="text.secondary">
                    Bu beklenen bir durum. Backend contract'ina göre `stocks` hafta sonu veya gece boş liste dönebilir.
                </Typography>
            </Box>
        );
    }

    if (rows.length === 0) {
        return (
            <Box sx={EMPTY_SX}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Aramaya uyan hisse kaydi yok.</Typography>
                <Typography variant="caption" color="text.secondary">Filtreyi temizleyip tekrar deneyin.</Typography>
            </Box>
        );
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, symbol: string) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onRowClick(symbol);
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
                        <TableCell>{col("stock", "Hisse")}</TableCell>
                        <TableCell>{col("sector", "Sektör")}</TableCell>
                        <TableCell>{col("price", "Fiyat")}</TableCell>
                        <TableCell>{col("change", "Değişim")}</TableCell>
                        <TableCell>{col("volume", "Hacim")}</TableCell>
                        <TableCell>{col("marketCap", "Piyasa Değeri")}</TableCell>
                        <TableCell>{col("range52w", "52H Aralık")}</TableCell>
                        <TableCell>{col("fetchedAt", "Son Çekim")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => {
                        const isDown = toSafeNumber(row.changePercent) !== null && (row.changePercent ?? 0) < 0;
                        return (
                            <TableRow
                                key={row.symbol}
                                hover
                                tabIndex={0}
                                role="button"
                                onClick={() => onRowClick(row.symbol)}
                                onKeyDown={(e) => handleKeyDown(e, row.symbol)}
                                sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                            >
                                <TableCell>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.symbol}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.shortName ?? row.longName ?? "Hisse"}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{row.sector ?? row.indexName ?? "-"}</TableCell>
                                <TableCell>{formatMoney(row.price, row.currency ?? "TRY")}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, color: isDown ? "error.main" : "success.main" }}>
                                        <Typography component="strong" variant="body2" sx={{ fontWeight: 700, color: "inherit" }}>
                                            {formatPercent(row.changePercent)}
                                        </Typography>
                                        <Typography component="span" variant="caption" sx={{ color: "inherit" }}>
                                            {formatSignedNumber(row.change, 2)}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{formatCompactNumber(row.volume)}</TableCell>
                                <TableCell>{formatCompactMoney(row.marketCap, row.currency ?? "TRY")}</TableCell>
                                <TableCell>
                                    {row.fiftyTwoWeekLow != null && row.fiftyTwoWeekHigh != null
                                        ? `${formatMoney(row.fiftyTwoWeekLow, row.currency ?? "TRY")} / ${formatMoney(row.fiftyTwoWeekHigh, row.currency ?? "TRY")}`
                                        : "-"}
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatLocalDate(row.tradeDate)}</Typography>
                                        <Typography variant="caption" color="text.secondary">{formatLocalDateTime(row.fetchedAt)}</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
