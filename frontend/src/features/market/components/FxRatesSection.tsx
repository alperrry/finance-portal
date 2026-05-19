import { Box, Typography } from "@mui/material";
import type { FxResponse } from "../api/marketApi";
import { formatNumber, toSafeNumber } from "../utils/marketFormatters";

type RateCardProps = { label: string; value: number | null; digits?: number };

function RateCard({ label, value, digits = 4 }: RateCardProps) {
    return (
        <Box
            sx={{
                flex: "1 1 140px",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "12px",
                p: "12px 16px",
            }}
        >
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.25 }}>
                {formatNumber(value, digits)}
            </Typography>
        </Box>
    );
}

type Props = { fxData: FxResponse | null };

export function FxRatesSection({ fxData }: Props) {
    if (!fxData) return null;

    const buy = toSafeNumber(fxData.forexBuying);
    const sell = toSafeNumber(fxData.forexSelling);
    const spread = buy !== null && sell !== null ? sell - buy : null;

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
                    Kur Bilgileri
                </Typography>
                {fxData.unit > 1 && (
                    <Typography variant="caption" color="text.secondary">
                        {fxData.unit} birim başına TRY
                    </Typography>
                )}
            </Box>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                <RateCard label="Döviz Alış" value={fxData.forexBuying} />
                <RateCard label="Döviz Satış" value={fxData.forexSelling} />
                <RateCard label="Efektif Alış" value={fxData.banknoteBuying} />
                <RateCard label="Efektif Satış" value={fxData.banknoteSelling} />
            </Box>

            {spread !== null && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">Döviz Makas:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {formatNumber(spread, 4)}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
