import { Box, Chip, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { BondResponse } from "../api/marketApi";
import { formatNumber, toSafeNumber } from "../utils/marketFormatters";

function maturityLabel(days: number | null): { label: string; color: "default" | "primary" | "warning" | "error" } {
    if (days === null) return { label: "Belirsiz", color: "default" };
    if (days <= 90) return { label: "Çok Kısa Vade (≤90 gün)", color: "error" };
    if (days <= 365) return { label: "Kısa Vade (≤1 yıl)", color: "warning" };
    if (days <= 1095) return { label: "Orta Vade (≤3 yıl)", color: "primary" };
    return { label: "Uzun Vade (>3 yıl)", color: "default" };
}

function bondTypeLabel(bondType: string | null): string {
    if (!bondType) return "Tahvil/Bono";
    if (bondType === "DEVLET_TAHVIL") return "Devlet Tahvili";
    if (bondType === "HAZINE_BONOSU") return "Hazine Bonosu";
    return bondType;
}

type Props = { bondData: BondResponse | null };

export function BondMetricsSection({ bondData }: Props) {
    if (!bondData) return null;

    const interest = toSafeNumber(bondData.interestRate);
    const compounded = toSafeNumber(bondData.compoundedRate);
    const spread = interest !== null && compounded !== null ? compounded - interest : null;
    const maturity = maturityLabel(bondData.maturityDays);

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
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.01em", mb: 2 }}>
                Tahvil Bilgileri
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5 }}>
                <Chip label={bondTypeLabel(bondData.bondType)} size="small" variant="outlined" />
                <Chip
                    label={maturity.label}
                    size="small"
                    color={maturity.color}
                    variant="outlined"
                />
                {bondData.currency && (
                    <Chip label={bondData.currency} size="small" variant="outlined" />
                )}
            </Box>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ flex: "1 1 160px" }}>
                    <Typography variant="caption" color="text.secondary">Basit Faiz</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {interest !== null ? `%${formatNumber(interest, 2)}` : "-"}
                    </Typography>
                </Box>
                <Box sx={{ flex: "1 1 160px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Bileşik Faiz</Typography>
                        <Tooltip
                            title="Kupon ödemelerinin aynı faiz oranıyla tekrar yatırıma yönlendirildiği varsayılarak hesaplanmış bileşik getiridir."
                            arrow
                        >
                            <InfoOutlinedIcon sx={{ fontSize: "0.85rem", color: "text.secondary", cursor: "help" }} />
                        </Tooltip>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {compounded !== null ? `%${formatNumber(compounded, 2)}` : "-"}
                    </Typography>
                </Box>
                {spread !== null && (
                    <Box sx={{ flex: "1 1 160px" }}>
                        <Typography variant="caption" color="text.secondary">Bileşikleşme Farkı</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            +{formatNumber(spread, 2)} puan
                        </Typography>
                    </Box>
                )}
                {bondData.maturityDays !== null && (
                    <Box sx={{ flex: "1 1 160px" }}>
                        <Typography variant="caption" color="text.secondary">Vade</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            {bondData.maturityDays} gün
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
