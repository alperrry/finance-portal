import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import { useTranslation } from "react-i18next";
import type { PortfolioResponse } from "../api/portfolioApi";
import { PortfolioCard } from "./PortfolioCard";

interface PortfolioDashboardContentProps {
    portfolios: PortfolioResponse[];
    loading: boolean;
    error: string | null;
    isEmpty: boolean;
    onReload: () => void;
    onCreate: () => void;
    onOpen: (portfolio: PortfolioResponse) => void;
    onEdit: (portfolio: PortfolioResponse) => void;
    onDelete: (portfolio: PortfolioResponse) => void;
}

export function PortfolioDashboardContent({
    portfolios,
    loading,
    error,
    isEmpty,
    onReload,
    onCreate,
    onOpen,
    onEdit,
    onDelete,
}: PortfolioDashboardContentProps) {
    const { t } = useTranslation();
    return (
        <>
            {error ? (
                <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" color="inherit" onClick={onReload}>{t("common.retry")}</Button>}>
                    {error}
                </Alert>
            ) : null}

            {loading ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent>
                                <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
                                <Skeleton variant="text" width="40%" sx={{ mb: 2 }} />
                                <Skeleton variant="text" width="80%" />
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : null}

            {isEmpty ? (
                <Stack sx={{ alignItems: "center", py: 8, gap: 1.5 }}>
                    <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 56, color: "text.disabled" }} aria-hidden="true" />
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{t("portfolio.dashboard.empty.title")}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, textAlign: "center" }}>
                        {t("portfolio.dashboard.empty.desc")}
                    </Typography>
                    <Button variant="contained" color="secondary" sx={{ mt: 1 }} onClick={onCreate}>
                        {t("portfolio.dashboard.empty.cta")}
                    </Button>
                </Stack>
            ) : null}

            {!loading && portfolios.length > 0 ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
                    {portfolios.map((portfolio) => (
                        <PortfolioCard
                            key={portfolio.id}
                            portfolio={portfolio}
                            onOpen={() => onOpen(portfolio)}
                            onEdit={() => onEdit(portfolio)}
                            onDelete={() => onDelete(portfolio)}
                        />
                    ))}
                </Box>
            ) : null}
        </>
    );
}
