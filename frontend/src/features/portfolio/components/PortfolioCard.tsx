import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
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
    const positionCount = portfolio.openPositionCount ?? 0;
    const hasPositions = positionCount > 0;

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
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
                "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.12)", transform: "translateY(-2px)" },
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
            }}
        >
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2, gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {portfolio.name}
                        </Typography>
                        <Chip label={portfolio.displayCurrency} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                    <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0 }} onClick={(event) => event.stopPropagation()}>
                        <Button size="small" variant="outlined" onClick={onEdit} aria-label={`${portfolio.name} ${t("portfolio.card.edit")}`}>{t("portfolio.card.edit")}</Button>
                        <Button size="small" variant="outlined" color="error" onClick={onDelete} aria-label={`${portfolio.name} ${t("portfolio.card.delete")}`}>{t("portfolio.card.delete")}</Button>
                    </Stack>
                </Stack>

                {hasPositions ? (
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {t("portfolio.card.totalValue")}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.2, mb: 1 }}>
                            {formatMoney(portfolio.totalValue, portfolio.displayCurrency)}
                        </Typography>
                        <Stack direction="row" sx={{ alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            {profitTone === "up" ? <TrendingUpIcon fontSize="small" sx={{ color: "success.main" }} />
                                : profitTone === "down" ? <TrendingDownIcon fontSize="small" sx={{ color: "error.main" }} />
                                : null}
                            <Typography variant="body2" color={toneColor(profitTone)} sx={{ fontWeight: 800 }}>
                                {formatSignedMoney(portfolio.totalProfitLoss, portfolio.displayCurrency)}
                            </Typography>
                            <Box
                                sx={{
                                    px: 0.75,
                                    py: 0.2,
                                    borderRadius: 1,
                                    bgcolor: profitTone === "up" ? "rgba(46, 125, 50, 0.10)" : profitTone === "down" ? "rgba(211, 47, 47, 0.10)" : "action.hover",
                                }}
                            >
                                <Typography component="span" variant="caption" color={toneColor(profitTone)} sx={{ fontWeight: 800 }}>
                                    {formatPercent(portfolio.totalProfitLossPct)}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                ) : (
                    <Box sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("portfolio.card.noPositions")}</Typography>
                        <Typography variant="body2" color="text.secondary">{t("portfolio.card.emptyHint")}</Typography>
                    </Box>
                )}
            </CardContent>

            <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {hasPositions ? t("portfolio.card.instrumentCount", { count: positionCount }) : t("portfolio.card.portfolioReady")}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                    {t("portfolio.card.startTrading")}
                </Typography>
            </Box>
        </Card>
    );
}
