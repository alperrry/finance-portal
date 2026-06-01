import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useMemo } from "react";
import type { ManualPositionResponse, PortfolioInstrumentType, PositionKind } from "../api/portfolioApi";
import { getInstrumentLabels } from "../types";
import { calcMaturityValue, formatMoney, formatPercent, formatQuantity, formatSignedMoney } from "../utils/portfolioFormatters";
import { useTranslation } from "react-i18next";

const VIRTUAL_THRESHOLD = 20;
const ROW_HEIGHT = 48;

type Props = {
    portfolioId: number;
    positions: ManualPositionResponse[];
    loading: boolean;
    kind: PositionKind;
    onKindChange: (kind: PositionKind) => void;
    onDelete: (positionId: number) => void;
    onSell: (position: ManualPositionResponse) => void;
    onSimulate: (position: ManualPositionResponse) => void;
};

function PnlBadge({ value, currency, isPercent }: { value: number | null | undefined; currency?: string; isPercent?: boolean }) {
    if (value == null) return <Typography variant="caption" color="text.disabled">—</Typography>;
    const positive = value > 0;
    const negative = value < 0;
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.3,
                px: 0.75,
                py: 0.15,
                borderRadius: 0.75,
                bgcolor: positive
                    ? "rgba(46, 125, 50, 0.10)"
                    : negative
                      ? "rgba(211, 47, 47, 0.10)"
                      : "transparent",
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: positive ? "success.main" : negative ? "error.main" : "text.secondary",
                    lineHeight: 1,
                }}
            >
                {positive ? "▲ " : negative ? "▼ " : ""}
                {isPercent ? formatPercent(value) : formatSignedMoney(value, currency ?? "TRY")}
            </Typography>
        </Box>
    );
}

const col = createColumnHelper<ManualPositionResponse>();

function asPositionColumns(columns: ColumnDef<ManualPositionResponse, never>[]): ColumnDef<ManualPositionResponse, unknown>[] {
    return columns as ColumnDef<ManualPositionResponse, unknown>[];
}

function supportsSimulation(position: ManualPositionResponse) {
    return (
        ((position.instrumentType === "STOCK" || position.instrumentType === "FUND" || position.instrumentType === "CURRENCY") && position.instrumentId !== null) ||
        position.instrumentType === "DEPOSIT" ||
        position.instrumentType === "BOND" ||
        position.instrumentType === "VIOP"
    );
}

function simulationButton(position: ManualPositionResponse, onSimulate: (pos: ManualPositionResponse) => void) {
    if (!supportsSimulation(position)) {
        return null;
    }
    return (
        <Tooltip title="USD simülasyonu">
            <IconButton size="small" color="secondary" onClick={() => onSimulate(position)}>
                <QueryStatsOutlinedIcon fontSize="small" />
            </IconButton>
        </Tooltip>
    );
}

function deleteColumn(onDelete: (id: number) => void, onSimulate: (pos: ManualPositionResponse) => void): ColumnDef<ManualPositionResponse, unknown> {
    return col.display({
        id: "actions",
        header: "",
        size: 84,
        cell: ({ row }) => (
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 0.25 }}>
                {simulationButton(row.original, onSimulate)}
                <Tooltip title="Pozisyonu sil">
                    <IconButton size="small" color="error" onClick={() => onDelete(row.original.id)}>
                        <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        ),
    });
}

function sellColumn(
    type: PortfolioInstrumentType,
    onSell: (pos: ManualPositionResponse) => void,
    onSimulate: (pos: ManualPositionResponse) => void,
): ColumnDef<ManualPositionResponse, unknown> {
    const label = type === "VIOP" || type === "DEPOSIT" ? "Kapat" : "Sat";
    return col.display({
        id: "sell",
        header: "",
        size: 104,
        cell: ({ row }) => (
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                {simulationButton(row.original, onSimulate)}
                <Button size="small" variant="outlined" color="secondary" onClick={() => onSell(row.original)} sx={{ fontSize: "0.72rem", px: 1 }}>
                    {label}
                </Button>
            </Stack>
        ),
    });
}

function getColumns(
    type: PortfolioInstrumentType,
    kind: PositionKind,
    onDelete: (id: number) => void,
    onSell: (pos: ManualPositionResponse) => void,
    onSimulate: (pos: ManualPositionResponse) => void,
): ColumnDef<ManualPositionResponse, unknown>[] {
    const isOpen = kind === "OPEN";

    const instrumentCell = col.display({
        id: "instrument",
        header: "Enstrüman",
        size: 150,
        cell: ({ row: { original: r } }) => (
            <Box sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {r.instrumentSymbol ?? r.bankName ?? getInstrumentLabels()[r.instrumentType]}
                </Typography>
                {r.instrumentName ? (
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {r.instrumentName}
                    </Typography>
                ) : null}
            </Box>
        ),
    });

    const qtyColumn = col.accessor("quantity", {
        header: "Miktar",
        size: 80,
        cell: ({ getValue }) => <Typography variant="body2">{formatQuantity(getValue())}</Typography>,
    });

    const entryPriceColumn = col.accessor("entryPrice", {
        header: type === "CURRENCY" ? "Alış Kuru" : "Alış Fiy.",
        size: 100,
        cell: ({ getValue }) => <Typography variant="body2">{formatMoney(getValue(), "TRY", 4)}</Typography>,
    });

    const currentPriceColumn = col.accessor("currentPrice", {
        header: type === "CURRENCY" ? "Güncel Kur" : type === "FUND" ? "Güncel NAV" : "Güncel Fiy.",
        size: 100,
        cell: ({ getValue }) => {
            const v = getValue();
            return v != null ? (
                <Typography variant="body2">{formatMoney(v, "TRY", 4)}</Typography>
            ) : (
                <Typography variant="caption" color="text.disabled">—</Typography>
            );
        },
    });

    const currentValueColumn = col.accessor("currentValue", {
        header: "Güncel Değer",
        size: 120,
        cell: ({ getValue }) => {
            const v = getValue();
            return v != null ? (
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(v, "TRY")}</Typography>
            ) : (
                <Typography variant="caption" color="text.disabled">—</Typography>
            );
        },
    });

    const unrealizedPnlColumn = col.accessor("unrealizedPnl", {
        header: "Gerç.Dışı K/Z",
        size: 130,
        cell: ({ getValue }) => <PnlBadge value={getValue()} currency="TRY" />,
    });

    const realizedPnlColumn = col.accessor("realizedPnl", {
        header: "Gerç. K/Z",
        size: 130,
        cell: ({ getValue }) => <PnlBadge value={getValue()} currency="TRY" />,
    });

    const pnlPctColumn = col.accessor("pnlPercent", {
        header: "K/Z %",
        size: 88,
        cell: ({ getValue }) => <PnlBadge value={getValue()} isPercent />,
    });

    const entryDateColumn = col.accessor("entryDate", {
        header: "Tarih",
        size: 100,
        cell: ({ getValue }) => <Typography variant="body2">{getValue() ?? "—"}</Typography>,
    });

    const exitDateColumn = col.display({
        id: "dates",
        header: "Alım — Satım",
        size: 150,
        cell: ({ row: { original: r } }) => (
            <Typography variant="body2">{r.entryDate ?? "—"} — {r.exitDate ?? "—"}</Typography>
        ),
    });

    const exitPriceColumn = col.display({
        id: "exitPrice",
        header: "Alış / Satış",
        size: 130,
        cell: ({ row: { original: r } }) => (
            <Typography variant="body2">
                {formatMoney(r.entryPrice, "TRY", 4)} / {formatMoney(r.exitPrice, "TRY", 4)}
            </Typography>
        ),
    });

    if (type === "VIOP") {
        const directionCol = col.accessor("direction", {
            header: "Yön",
            size: 80,
            cell: ({ getValue }) => (
                <Chip
                    label={getValue() === "LONG" ? "Long" : "Short"}
                    size="small"
                    color={getValue() === "LONG" ? "success" : "error"}
                    variant="outlined"
                />
            ),
        });
        const underlyingCol = col.display({
            id: "underlying",
            header: "Dayanak",
            size: 110,
            cell: ({ row: { original: r } }) => (
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {r.underlyingSymbol ?? r.instrumentSymbol ?? "—"}
                </Typography>
            ),
        });
        const marginCol = col.accessor("marginAmount", {
            header: "Teminat",
            size: 100,
            cell: ({ getValue }) => {
                const v = getValue();
                return v != null ? (
                    <Typography variant="body2">{formatMoney(v, "TRY")}</Typography>
                ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                );
            },
        });
        return asPositionColumns(isOpen
            ? [underlyingCol, directionCol, qtyColumn, entryPriceColumn, currentPriceColumn, marginCol, unrealizedPnlColumn, pnlPctColumn, entryDateColumn, sellColumn(type, onSell, onSimulate)]
            : [underlyingCol, directionCol, qtyColumn, exitPriceColumn, marginCol, realizedPnlColumn, pnlPctColumn, exitDateColumn, deleteColumn(onDelete, onSimulate)]);
    }

    if (type === "BOND") {
        const maturityCol = col.accessor("maturityDate", {
            header: "Vade",
            size: 100,
            cell: ({ getValue }) => <Typography variant="body2">{getValue() ?? "—"}</Typography>,
        });
        const maturityValueCol = col.display({
            id: "maturityValue",
            header: "Vade Sonu Değer",
            size: 140,
            cell: ({ row: { original: r } }) => {
                const v = calcMaturityValue(r);
                return v != null ? (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "info.main" }}>
                        {formatMoney(v, "TRY")}
                    </Typography>
                ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                );
            },
        });
        return asPositionColumns(isOpen
            ? [instrumentCell, qtyColumn, entryPriceColumn, currentPriceColumn, maturityCol, maturityValueCol, unrealizedPnlColumn, pnlPctColumn, sellColumn(type, onSell, onSimulate)]
            : [instrumentCell, qtyColumn, exitPriceColumn, maturityCol, realizedPnlColumn, pnlPctColumn, exitDateColumn, deleteColumn(onDelete, onSimulate)]);
    }

    if (type === "DEPOSIT") {
        const bankCol = col.display({
            id: "bank",
            header: "Banka",
            size: 130,
            cell: ({ row: { original: r } }) => (
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.bankName ?? "—"}</Typography>
            ),
        });
        const interestCol = col.accessor("interestRate", {
            header: "Faiz %",
            size: 80,
            cell: ({ getValue }) => {
                const v = getValue();
                return v != null ? (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.toFixed(2)}%</Typography>
                ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                );
            },
        });
        const maturityDateCol = col.accessor("maturityDate", {
            header: "Vade Tarihi",
            size: 105,
            cell: ({ getValue }) => <Typography variant="body2">{getValue() ?? "—"}</Typography>,
        });
        const maturityValueCol = col.display({
            id: "maturityValue",
            header: "Vade Sonu Değer",
            size: 140,
            cell: ({ row: { original: r } }) => {
                const v = calcMaturityValue(r);
                return v != null ? (
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.75, py: 0.15, borderRadius: 0.75, bgcolor: "rgba(2, 136, 209, 0.08)" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.78rem", color: "info.main" }}>
                            ✓ {formatMoney(v, "TRY")}
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                );
            },
        });
        return asPositionColumns(isOpen
            ? [bankCol, entryPriceColumn, qtyColumn, interestCol, maturityDateCol, maturityValueCol, unrealizedPnlColumn, pnlPctColumn, sellColumn(type, onSell, onSimulate)]
            : [bankCol, entryPriceColumn, qtyColumn, realizedPnlColumn, pnlPctColumn, exitDateColumn, deleteColumn(onDelete, onSimulate)]);
    }

    // STOCK, FUND, CURRENCY — generic
    if (type === "CURRENCY") {
        return asPositionColumns(isOpen
            ? [instrumentCell, qtyColumn, entryPriceColumn, currentPriceColumn, currentValueColumn, unrealizedPnlColumn, pnlPctColumn, entryDateColumn, sellColumn(type, onSell, onSimulate)]
            : [instrumentCell, qtyColumn, exitPriceColumn, realizedPnlColumn, pnlPctColumn, exitDateColumn, deleteColumn(onDelete, onSimulate)]);
    }

    return asPositionColumns(isOpen
        ? [instrumentCell, qtyColumn, entryPriceColumn, currentPriceColumn, unrealizedPnlColumn, pnlPctColumn, entryDateColumn, sellColumn(type, onSell, onSimulate)]
        : [instrumentCell, qtyColumn, exitPriceColumn, realizedPnlColumn, pnlPctColumn, exitDateColumn, deleteColumn(onDelete, onSimulate)]);
}

type GroupTableProps = {
    rows: ManualPositionResponse[];
    type: PortfolioInstrumentType;
    kind: PositionKind;
    onDelete: (id: number) => void;
    onSell: (pos: ManualPositionResponse) => void;
    onSimulate: (pos: ManualPositionResponse) => void;
};

function GroupTable({ rows, type, kind, onDelete, onSell, onSimulate }: GroupTableProps) {
    const columns = useMemo(() => getColumns(type, kind, onDelete, onSell, onSimulate), [type, kind, onDelete, onSell, onSimulate]);
    const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
    const tableRows = table.getRowModel().rows;
    const useVirtual = tableRows.length >= VIRTUAL_THRESHOLD;

    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: tableRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 5,
        enabled: useVirtual,
    });

    const headerGroups = table.getHeaderGroups();

    return (
        <Box
            ref={parentRef}
            sx={{
                overflowX: "auto",
                maxHeight: useVirtual ? 400 : undefined,
                overflowY: useVirtual ? "auto" : undefined,
            }}
        >
            <Box
                component="table"
                sx={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                    "& th, & td": {
                        px: 1.5,
                        py: 0,
                        textAlign: "left",
                        verticalAlign: "middle",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        height: `${ROW_HEIGHT}px`,
                        fontSize: "0.8rem",
                    },
                    "& th": {
                        fontWeight: 700,
                        color: "text.secondary",
                        fontSize: "0.72rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        bgcolor: "action.hover",
                    },
                    "& tbody tr:hover": {
                        bgcolor: "action.hover",
                    },
                    "& tbody tr:last-child td": {
                        borderBottom: "none",
                    },
                }}
            >
                <thead>
                    {headerGroups.map((hg) => (
                        <tr key={hg.id}>
                            {hg.headers.map((header) => (
                                <Box
                                    component="th"
                                    key={header.id}
                                    sx={{ width: header.getSize() }}
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </Box>
                            ))}
                        </tr>
                    ))}
                </thead>
                {useVirtual ? (
                    <tbody style={{ position: "relative", height: virtualizer.getTotalSize() }}>
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const row = tableRows[virtualRow.index];
                            return (
                                <tr
                                    key={row.id}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        transform: `translateY(${virtualRow.start}px)`,
                                        height: `${virtualRow.size}px`,
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <Box component="td" key={cell.id} sx={{ width: cell.column.getSize() }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </Box>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                ) : (
                    <tbody>
                        {tableRows.map((row) => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <Box component="td" key={cell.id} sx={{ width: cell.column.getSize() }}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </Box>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                )}
            </Box>
        </Box>
    );
}

const TYPE_ORDER: PortfolioInstrumentType[] = ["STOCK", "FUND", "CURRENCY", "BOND", "VIOP", "DEPOSIT"];

export function PositionsByTypeTable({ positions, loading, kind, onKindChange, onDelete, onSell, onSimulate }: Props) {
    const { t } = useTranslation();
    const groups = useMemo(() => {
        const map = new Map<PortfolioInstrumentType, ManualPositionResponse[]>();
        for (const pos of positions) {
            const existing = map.get(pos.instrumentType) ?? [];
            existing.push(pos);
            map.set(pos.instrumentType, existing);
        }
        return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({ type: t, rows: map.get(t)! }));
    }, [positions]);

    return (
        <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("portfolio.positions.overline")}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{t("portfolio.positions.title")}</Typography>
                </Box>
            </Stack>

            <Tabs
                value={kind}
                onChange={(_, val: PositionKind) => onKindChange(val)}
                sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
                <Tab label={t("portfolio.positions.openTab")} value="OPEN" />
                <Tab label={t("portfolio.positions.closedTab")} value="CLOSED" />
            </Tabs>

            {loading && (
                <Stack sx={{ alignItems: "center", py: 3 }}>
                    <CircularProgress size={24} />
                </Stack>
            )}

            {!loading && groups.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    {kind === "OPEN" ? t("portfolio.positions.noOpen") : t("portfolio.positions.noClosed")}
                </Typography>
            )}

            {!loading && groups.length > 0 && (
                <Stack sx={{ gap: 1 }}>
                    {groups.map(({ type, rows }, index) => (
                        <Accordion key={type} defaultExpanded={index === 0} disableGutters elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}>
                                <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {getInstrumentLabels()[type]}
                                    </Typography>
                                    <Chip label={rows.length} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <GroupTable rows={rows} type={type} kind={kind} onDelete={onDelete} onSell={onSell} onSimulate={onSimulate} />
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Stack>
            )}
        </Box>
    );
}
