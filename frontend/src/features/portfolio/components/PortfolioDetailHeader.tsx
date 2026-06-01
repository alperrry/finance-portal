import { Box, Button, Chip, CircularProgress, Skeleton, Stack, Typography } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { useTranslation } from "react-i18next";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import type { PortfolioDetailPageState } from "../hooks/usePortfolioDetailPage";

interface PortfolioDetailHeaderProps {
    page: PortfolioDetailPageState;
}

export function PortfolioDetailHeader({ page }: PortfolioDetailHeaderProps) {
    const { t } = useTranslation();
    const { portfolio, detailState, pending, handlers } = page;

    return (
        <>
            <Button
                variant="text"
                size="small"
                onClick={handlers.backToPortfolios}
                sx={{ mb: 2, color: "text.secondary" }}
            >
                {t("portfolio.detail.back")}
            </Button>

            <SectionPanel sx={{ mb: 3 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                    <Box>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("portfolio.detail.title")}</Typography>
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
                                {t("portfolio.detail.edit")}
                            </Button>
                        ) : null}
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={pending.pdfBusy ? <CircularProgress size={14} /> : <DownloadOutlinedIcon />}
                            onClick={handlers.handlePdfExport}
                            disabled={!portfolio || pending.pdfBusy}
                        >
                            {t("portfolio.detail.pdfDownload")}
                        </Button>
                        <Button variant="contained" color="secondary" onClick={handlers.openTradeModal} disabled={!portfolio}>
                            + Pozisyon Ekle
                        </Button>
                    </Stack>
                </Stack>
            </SectionPanel>
        </>
    );
}
