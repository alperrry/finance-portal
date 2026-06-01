import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PortfolioResponse } from "../api/portfolioApi";
import { formatMoney, formatPercent, formatSignedMoney, getProfitTone } from "../utils/portfolioFormatters";

type Props = {
    portfolio: PortfolioResponse;
    onOpen: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

const toneColor = (tone: string) => tone === "up" ? "success.main" : tone === "down" ? "error.main" : "text.secondary";

export function PortfolioCard({ portfolio, onOpen, onEdit, onDelete }: Props) {
    const { t } = useTranslation();
    const profitTone = getProfitTone(portfolio.totalProfitLoss);
    const itemCount = portfolio.items?.length ?? 0;
    const hasPositions = itemCount > 0;
    const valueNote = portfolio.totalValue === null ? t("portfolio.card.openValuationNote") : t("portfolio.card.positionValue");

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
    };

    return (
        <Card
            tabIndex={0}
            role="button"
            onClick={onOpen}
            onKeyDown={handleKeyDown}
            sx={{
                cursor: "pointer",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.12)" },
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
            }}
        >
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5, gap: 1 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{portfolio.name}</Typography>
                        <Chip label={portfolio.displayCurrency} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                    <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0 }} onClick={(event) => event.stopPropagation()}>
                        <Button size="small" variant="outlined" onClick={onEdit} aria-label={`${portfolio.name} düzenle`}>{t("portfolio.card.edit")}</Button>
                        <Button size="small" variant="outlined" color="error" onClick={onDelete} aria-label={`${portfolio.name} sil`}>{t("portfolio.card.delete")}</Button>
                    </Stack>
                </Stack>

                {hasPositions ? (
                    <>
                        <Typography variant="h5" sx={{ fontWeight: 900, my: 1 }}>
                            {formatMoney(portfolio.totalValue, portfolio.displayCurrency)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{valueNote}</Typography>
                    </>
                ) : (
                    <Box sx={{ my: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("portfolio.card.noPositions")}</Typography>
                        <Typography variant="body2" color="text.secondary">{t("portfolio.card.startTrading")}</Typography>
                    </Box>
                )}
            </CardContent>

            <Box sx={{ px: 2, pb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {hasPositions ? (
                    <Box>
                        <Typography variant="body2" color={toneColor(profitTone)} sx={{ fontWeight: 700 }}>
                            {formatSignedMoney(portfolio.totalProfitLoss, portfolio.displayCurrency)}{" "}
                            <Typography component="span" variant="caption" color={toneColor(profitTone)}>
                                {formatPercent(portfolio.totalProfitLossPct)}
                            </Typography>
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="caption" color="text.secondary">{t("portfolio.card.portfolioReady")}</Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                    {itemCount > 0 ? `${itemCount} enstrüman` : t("portfolio.card.noPosition")}
                </Typography>
            </Box>
        </Card>
    );
}
