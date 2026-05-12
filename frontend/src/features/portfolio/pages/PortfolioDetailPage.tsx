import { Box } from "@mui/material";
import { KapitalShell } from "../../../components/layout";
import { PortfolioDetailContent } from "../components/PortfolioDetailContent";
import { PortfolioDetailHeader } from "../components/PortfolioDetailHeader";
import { PortfolioDetailModals } from "../components/PortfolioDetailModals";
import { usePortfolioDetailPage } from "../hooks/usePortfolioDetailPage";

export function PortfolioDetailPage() {
    const page = usePortfolioDetailPage();

    return (
        <KapitalShell activePage="portfolios" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <PortfolioDetailHeader page={page} />
                <PortfolioDetailContent page={page} />
            </Box>
            <PortfolioDetailModals page={page} />
        </KapitalShell>
    );
}

export default PortfolioDetailPage;
