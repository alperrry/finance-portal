import { Box, Stack, Typography, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { SimulationLensResult, SimulationResponse } from "../api/portfolioApi";
import { formatMoney, formatPercent, formatSignedMoney, getProfitTone } from "../utils/portfolioFormatters";

// 1. TONE COLOR YARDIMCISI
const toneColor = (value: number | null | undefined) => {
    const tone = getProfitTone(value);
    if (tone === "up") return "success.main";
    if (tone === "down") return "error.main";
    return "text.secondary";
};

// 2. SATIR BİLEŞENİ (HİZALAMA DÜZELTİLDİ)
function RateRow({ label, value }: { label: string; value: number | string | null | undefined }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            {/* whiteSpace: "nowrap" ile alt satıra düşme engellendi */}
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {label}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right" }}>
                {typeof value === "number" ? formatMoney(value, "TRY", 4) : value ?? "-"}
            </Typography>
        </Box>
    );
}

// 3. TEKLİ KART BİLEŞENİ (TRUNCATE & TOOLTIP DÜZELTİLDİ)
function ResultBlock({
                         title, result, costLabel = "Maliyet", rateLabel = "O Günkü Fiyat", hideRate = false, infoTooltip
                     }: {
    title: string; result: SimulationLensResult; costLabel?: string; rateLabel?: string; hideRate?: boolean; infoTooltip?: string;
}) {

    // Kâr/Zarar metnini değişkene aldık (Tooltip ile sarmalamak kolay olsun diye)
    const pnlDisplay = (
        <Typography variant="h5" sx={{ fontWeight: 900, color: toneColor(result.absolutePnl), mt: 0.5 }}>
            {formatSignedMoney(result.absolutePnl, result.currency)}
        </Typography>
    );

    return (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
            {/* BAŞLIK: Taşan metni kes (...) ve Tooltip ile tam adını göster */}
            <Tooltip title={title} placement="top" arrow>
                <Typography
                    variant="overline"
                    color="secondary"
                    sx={{
                        fontWeight: 800,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {title}
                </Typography>
            </Tooltip>

            {/* KÂR/ZARAR: Eğer infoTooltip gönderilmişse (örn: USD için) baloncuk ekle */}
            {infoTooltip ? (
                <Tooltip title={infoTooltip} placement="right" arrow>
                    <Box sx={{ display: 'inline-block', width: 'fit-content' }}>
                        {pnlDisplay}
                    </Box>
                </Tooltip>
            ) : (
                pnlDisplay
            )}

            <Typography variant="body2" color={toneColor(result.percentagePnl)} sx={{ fontWeight: 700, mb: 1.5 }}>
                {formatPercent(result.percentagePnl)}
            </Typography>

            {/* ALT SATIRLAR: mt: "auto" ile en aşağıya itilip tüm kartların boyları eşitlenir */}
            <Stack sx={{ gap: 0.75, mt: "auto" }}>
                <RateRow label={costLabel} value={formatMoney(result.costBasis, result.currency)} />
                <RateRow label="Güncel Değer" value={formatMoney(result.currentValue, result.currency)} />
                {!hideRate && result.purchaseRate !== null ? <RateRow label={rateLabel} value={result.purchaseRate} /> : null}
            </Stack>
        </Box>
    );
}

// 4. DIŞARIYA EXPORT EDİLEN ANA GRUP BİLEŞENİ
export function SimulationCardGroup({ data, baselineTitle = "Nominal TRY" }: { data: SimulationResponse; baselineTitle?: string }) {
    const { t } = useTranslation();
    const usdResult = data.lenses.USD ?? null;
    const inflationResult = data.lenses.INFLATION_ADJUSTED ?? null;

    return (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", flex: 1 }}>
            <ResultBlock title={baselineTitle} result={data.baseline} costLabel={t("portfolio.simulation.cost")} hideRate />

            {usdResult && (
                <ResultBlock
                    title={t("portfolio.simulation.usdBased")}
                    result={usdResult}
                    costLabel={t("portfolio.simulation.cost")}
                    rateLabel={t("portfolio.simulation.entryRate")}
                    infoTooltip={t("portfolio.simulation.pnlNote")}
                />
            )}

            {inflationResult && (
                <ResultBlock
                    title={t("portfolio.simulation.inflationBased")}
                    result={inflationResult}
                    costLabel={t("portfolio.simulation.cost")}
                    hideRate
                />
            )}
        </Box>
    );
}