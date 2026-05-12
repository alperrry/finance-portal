import { Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import type { PortfolioDetailPageState } from "../hooks/usePortfolioDetailPage";

interface PortfolioDetailHeaderProps {
    page: PortfolioDetailPageState;
}

export function PortfolioDetailHeader({ page }: PortfolioDetailHeaderProps) {
    const { portfolio, detailState, handlers } = page;

    return (
        <>
            <Button
                variant="text"
                size="small"
                onClick={handlers.backToPortfolios}
                sx={{ mb: 2, color: "text.secondary" }}
            >
                ← Portföylere dön
            </Button>

            <SectionPanel sx={{ mb: 3 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                    <Box>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Portföy Detayı</Typography>
                        <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            {detailState.loading ? (
                                <Skeleton variant="text" width={200} sx={{ fontSize: "2rem" }} />
                            ) : (
                                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                                    {portfolio?.name ?? "—"}
                                </Typography>
                            )}
                            {portfolio ? (
                                <Chip label={portfolio.displayCurrency} size="small" variant="outlined" />
                            ) : null}
                        </Stack>
                    </Box>
                    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                        {portfolio ? (
                            <Button variant="outlined" size="small" onClick={() => handlers.openEdit(portfolio)}>
                                Düzenle
                            </Button>
                        ) : null}
                        <Button variant="contained" color="secondary" onClick={handlers.openTradeModal} disabled={!portfolio}>
                            + Yeni İşlem
                        </Button>
                    </Stack>
                </Stack>
            </SectionPanel>
        </>
    );
}
