import { Box } from "@mui/material";
import { KapitalShell } from "../../../components/layout";
import { AnalysisIndicatorSnapshot } from "../components/AnalysisIndicatorSnapshot";
import { AnalysisMetricsBar } from "../components/AnalysisMetricsBar";
import { AnalysisChartPanel } from "../components/AnalysisChartPanel";
import { AnalysisHeaderPanel } from "../components/AnalysisHeaderPanel";
import { useAnalysisPage } from "../hooks/useAnalysisPage";

export default function AnalysisPage() {
    const page = useAnalysisPage();

    return (
        <KapitalShell activePage="analysis" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <AnalysisHeaderPanel page={page} />
                <AnalysisMetricsBar
                    cards={page.history.metricCards}
                    isLoading={page.history.isHistoryLoading}
                    latestDate={page.selection.latestDate}
                />
                <AnalysisIndicatorSnapshot cards={page.history.indicatorSnapshotCards} />
                <AnalysisChartPanel page={page} />
            </Box>
        </KapitalShell>
    );
}
