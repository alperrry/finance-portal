/* eslint-disable react-hooks/refs */
import { Alert, Box, Button, IconButton, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
    CandlestickChart,
} from "../../../components/charts/CandlestickChart";
import { AnalysisLineChart as LineChart } from "./LightweightLineChart";
import { MaximizeIcon, MinimizeIcon } from "./ChartFullscreenIcons";
import { DrawingToolbar } from "./DrawingToolbar";
import { AnalysisComparisonPanel } from "./AnalysisComparisonPanel";
import type { AnalysisPageState } from "../hooks/useAnalysisPage";
import { OVERLAY_INDICATOR_OPTIONS } from "../types";
import type { ChartType, OverlayIndicatorKey } from "../types";
import {
    formatCompactNumber,
    formatValueByType,
} from "../utils/analysisFormatters";

interface AnalysisChartPanelProps {
    page: AnalysisPageState;
}

export function AnalysisChartPanel({ page }: AnalysisChartPanelProps) {
    const { t } = useTranslation();
    const {
        selection,
        history,
        chart,
        drawings,
        fullscreen,
        comparisonPanel,
        handlers,
    } = page;

    return (
        <Paper
            component="section"
            ref={handlers.setChartPanelElement}
            sx={{
                p: { xs: 2, md: 3 },
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 14px 40px rgba(17,17,17,0.06)",
                ...(fullscreen.isChartFullscreen && { bgcolor: "background.paper", overflowY: "auto" }),
            }}
        >
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <Box>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("analysis.chartPanel.overline")}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{selection.selectedOption?.name ?? t("analysis.chartPanel.historicalSeries")}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t("analysis.chartPanel.description")}
                    </Typography>
                </Box>
                <Stack direction="row" sx={{ gap: 1, flexShrink: 0 }}>
                    <IconButton
                        size="small"
                        onClick={() => void handlers.toggleChartFullscreen()}
                        aria-label={fullscreen.isChartFullscreen ? t("analysis.chartPanel.fullscreenExitAria") : t("analysis.chartPanel.fullscreenEnterAria")}
                        title={fullscreen.isChartFullscreen ? t("analysis.chartPanel.fullscreenExit") : t("analysis.chartPanel.fullscreenEnter")}
                    >
                        {fullscreen.isChartFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                    </IconButton>
                    <Button
                        variant={comparisonPanel.open ? "contained" : "outlined"}
                        color={comparisonPanel.open ? "secondary" : "inherit"}
                        size="small"
                        onClick={() => handlers.setComparePanelOpen((value) => !value)}
                    >
                        {comparisonPanel.open ? t("analysis.chartPanel.hidePanel") : t("analysis.chartPanel.addCompare")}
                    </Button>
                </Stack>
            </Stack>

            <Stack sx={{ gap: 1.5, mb: 2 }}>
                <Stack direction="row" sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    {chart.supportsCandlestick ? (
                        <ToggleButtonGroup
                            exclusive
                            value={chart.chartType}
                            onChange={(_, val: ChartType | null) => { if (val) handlers.setChartType(val); }}
                            size="small"
                            aria-label={t("analysis.chartPanel.chartTypeAria")}
                        >
                            <ToggleButton value="line">{t("analysis.chartPanel.line")}</ToggleButton>
                            <ToggleButton value="candle">{t("analysis.chartPanel.candle")}</ToggleButton>
                        </ToggleButtonGroup>
                    ) : null}
                </Stack>

                {selection.resolvedType === "stocks" ? (
                    <Box>
                        <Typography variant="caption" color="secondary" sx={{ fontWeight: 800, display: "block", mb: 0.5 }}>
                            {t("analysis.chartPanel.overlayOverline")}
                        </Typography>
                        <ToggleButtonGroup
                            value={chart.activeOverlayIndicators}
                            onChange={(_, vals: OverlayIndicatorKey[]) => handlers.setActiveOverlayIndicators(vals)}
                            size="small"
                            aria-label={t("analysis.chartPanel.overlayAria")}
                            sx={{ flexWrap: "wrap" }}
                        >
                            {OVERLAY_INDICATOR_OPTIONS.map((option) => (
                                <ToggleButton key={option.key} value={option.key}>{option.label}</ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                ) : null}

                {history.isIndicatorHistoryLoading ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>{t("analysis.chartPanel.indicatorsLoading")}</Alert>
                ) : history.indicatorHistoryError ? (
                    <Alert severity="warning" sx={{ py: 0.5 }}>{t("analysis.chartPanel.indicatorError")} {history.indicatorHistoryError}</Alert>
                ) : null}

                <Stack direction="row" sx={{ gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                    {chart.chartLegendSeries.map((item) => (
                        <Stack key={item.key} direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                            <Typography variant="caption">{item.label}</Typography>
                        </Stack>
                    ))}
                </Stack>
            </Stack>

            {history.isHistoryLoading ? (
                <Alert severity="info">{t("analysis.chartPanel.dataLoading")}</Alert>
            ) : history.historyError ? (
                <Alert severity="error"><strong>{t("analysis.chartPanel.dataError")}</strong> {history.historyError}</Alert>
            ) : history.enrichedHistory.length === 0 ? (
                <Alert severity="info">{t("analysis.chartPanel.noData")}</Alert>
            ) : chart.effectiveChartType === "candle" ? (
                <Box>
                    {chart.supportsCandlestick ? (
                        <DrawingToolbar
                            activeTool={drawings.drawingTool}
                            toolDisabled={drawings.drawingToolsDisabled}
                            busy={drawings.drawingBusy}
                            canClear={drawings.drawings.length > 0}
                            onSelect={handlers.handleDrawingToolSelect}
                            onClear={handlers.handleClearDrawings}
                        />
                    ) : null}
                    <CandlestickChart
                        key={`candle-${selection.resolvedType}-${selection.resolvedCode}-${selection.selectedRange}-${chart.activeOverlayIndicators.join(",")}`}
                        data={history.candlestickData}
                        overlays={history.candlestickOverlays}
                        clouds={history.candlestickClouds}
                        tooltipIndicators={chart.candlestickTooltipIndicators}
                        drawings={drawings.drawings}
                        drawingMode={drawings.drawingTool}
                        drawingDraft={drawings.drawingDraft}
                        onDrawingPoint={handlers.handleDrawingPoint}
                        emptyLabel={t("analysis.chartPanel.noCandleData")}
                        valueFormatter={(value) => formatValueByType(selection.resolvedType, value)}
                        volumeFormatter={formatCompactNumber}
                    />
                </Box>
            ) : (
                <Box>
                    <LineChart
                        dates={history.dates}
                        series={history.priceSeries}
                        emptyLabel={t("analysis.chartPanel.noCandleData")}
                        yFormatter={(value) => formatValueByType(selection.resolvedType, value)}
                        fixedDomain={undefined}
                        referenceLines={[]}
                        tooltipData={history.enrichedHistory}
                        valueFormatter={(value) => formatValueByType(selection.resolvedType, value)}
                        volumeFormatter={formatCompactNumber}
                    />
                </Box>
            )}

            {comparisonPanel.open ? <AnalysisComparisonPanel page={page} /> : null}
        </Paper>
    );
}
