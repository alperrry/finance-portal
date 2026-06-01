import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, IconButton, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import type { FxResponse } from "../api/marketApi";
import { formatLocalDate, formatNumber, toSafeNumber } from "../utils/marketFormatters";

type Props = { fxRows: FxResponse[] };

function computeResult(
    amount: number,
    fromCode: string,
    toCode: string,
    fxMap: Map<string, FxResponse>,
    field: "forexBuying" | "forexSelling",
): number | null {
    if (fromCode === toCode) return amount;

    let inTry: number;
    if (fromCode === "TRY") {
        inTry = amount;
    } else {
        const fx = fxMap.get(fromCode);
        if (!fx) return null;
        const r = toSafeNumber(fx[field]);
        if (r === null) return null;
        inTry = (amount * r) / (fx.unit ?? 1);
    }

    if (toCode === "TRY") return inTry;

    const fx = fxMap.get(toCode);
    if (!fx) return null;
    const r = toSafeNumber(fx[field]);
    if (r === null) return null;
    return (inTry * (fx.unit ?? 1)) / r;
}

type ResultCardProps = { label: string; value: number | null; currency: string };

function ResultCard({ label, value, currency }: ResultCardProps) {
    const digits = currency === "TRY" ? 4 : 6;
    return (
        <Box
            sx={{
                flex: "1 1 160px",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "12px",
                p: "12px 16px",
            }}
        >
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.25 }}>
                {value !== null ? `${formatNumber(value, digits)} ${currency}` : "—"}
            </Typography>
        </Box>
    );
}

export function CurrencyConverterCard({ fxRows }: Props) {
    const { t } = useTranslation();
    const [amount, setAmount] = useState("1");
    const [fromCode, setFromCode] = useState("USD");
    const [toCode, setToCode] = useState("TRY");

    const currencies = useMemo(() => ["TRY", ...fxRows.map((r) => r.currencyCode)], [fxRows]);
    const fxMap = useMemo(() => new Map(fxRows.map((r) => [r.currencyCode, r])), [fxRows]);

    const parsedAmount = parseFloat(amount.replace(",", "."));
    const valid = Number.isFinite(parsedAmount) && parsedAmount > 0;

    const buyingResult = valid ? computeResult(parsedAmount, fromCode, toCode, fxMap, "forexBuying") : null;
    const sellingResult = valid ? computeResult(parsedAmount, fromCode, toCode, fxMap, "forexSelling") : null;

    const refCode = fromCode !== "TRY" ? fromCode : toCode;
    const rateDate = fxMap.get(refCode)?.rateDate ?? fxRows[0]?.rateDate;

    function swap() {
        setFromCode(toCode);
        setToCode(fromCode);
    }

    const safeFrom = currencies.includes(fromCode) ? fromCode : "TRY";
    const safeTo = currencies.includes(toCode) ? toCode : "TRY";

    return (
        <Box
            sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "16px",
                p: "20px 24px",
                bgcolor: "background.paper",
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {t("market.fx.converter.title")}
                </Typography>
            </Box>

            <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{ gap: 1, alignItems: { sm: "center" }, mb: 2, flexWrap: "wrap" }}
            >
                <TextField
                    size="small"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    slotProps={{ htmlInput: { inputMode: "decimal", style: { textAlign: "right" } } }}
                    sx={{ maxWidth: 120 }}
                />
                <Select
                    size="small"
                    value={safeFrom}
                    onChange={(e) => setFromCode(e.target.value)}
                    sx={{ minWidth: 90 }}
                >
                    {currencies.map((c) => (
                        <MenuItem key={c} value={c}>
                            {c}
                        </MenuItem>
                    ))}
                </Select>

                <IconButton size="small" onClick={swap} aria-label={t("market.fx.converter.swapAriaLabel")}>
                    <SwapHorizIcon fontSize="small" />
                </IconButton>

                <Select
                    size="small"
                    value={safeTo}
                    onChange={(e) => setToCode(e.target.value)}
                    sx={{ minWidth: 90 }}
                >
                    {currencies.map((c) => (
                        <MenuItem key={c} value={c}>
                            {c}
                        </MenuItem>
                    ))}
                </Select>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
                <ResultCard label={t("market.fx.buyLabel")} value={buyingResult} currency={safeTo} />
                <ResultCard label={t("market.fx.sellLabel")} value={sellingResult} currency={safeTo} />
            </Box>

            {rateDate && (
                <Typography variant="caption" color="text.disabled">
                    TCMB • {formatLocalDate(rateDate)}
                </Typography>
            )}
        </Box>
    );
}
