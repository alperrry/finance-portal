import { Alert, Box, Button, Chip, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    CandlestickChart,
    type ChartDrawingPoint,
} from "../../../components/charts/CandlestickChart";
import { KapitalShell } from "../../../components/layout";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { AnalysisLineChart as LineChart } from "../components/AnalysisLineChart";
import { MaximizeIcon, MinimizeIcon } from "../components/ChartFullscreenIcons";
import { DrawingToolbar } from "../components/DrawingToolbar";
import { useDrawings } from "../../../hooks/useDrawings";
import type { CreateDrawingRequest, DrawingType } from "../api/drawingsApi";
import { AnalysisIndicatorSnapshot } from "../components/AnalysisIndicatorSnapshot";
import { AnalysisMetricsBar } from "../components/AnalysisMetricsBar";
import { useAnalysisCatalog } from "../hooks/useAnalysisCatalog";
import { useAnalysisHistory } from "../hooks/useAnalysisHistory";
import { useAnalysisComparison } from "../hooks/useAnalysisComparison";
import {
    CHART_COLORS,
    DEFAULT_DRAWING_STYLE,
    OVERLAY_INDICATOR_OPTIONS,
    RANGE_OPTIONS,
    TYPE_META,
    TYPE_ORDER,
} from "../types";
import type { ChartType, DrawingTool, OverlayIndicatorKey } from "../types";
import {
    findFirstAvailableType,
    formatCompactNumber,
    formatDateLabel,
    formatDecimal,
    formatPercent,
    formatValueByType,
    getRangeDates,
    parseRange,
    parseType,
    sanitizeCompareCodes,
    toDrawingInstrumentType,
} from "../utils/analysisFormatters";

export default function AnalysisPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSearch = searchParams.toString();
    const chartPanelRef = useRef<HTMLElement | null>(null);
    const [chartType, setChartType] = useState<ChartType>("candle");
    const [drawingTool, setDrawingTool] = useState<DrawingTool>("select");
    const [drawingDraft, setDrawingDraft] = useState<ChartDrawingPoint | null>(null);
    const [activeOverlayIndicators, setActiveOverlayIndicators] = useState<OverlayIndicatorKey[]>(["sma20", "sma50"]);
    const [isChartFullscreen, setIsChartFullscreen] = useState(false);
    const [comparePanelOpen, setComparePanelOpen] = useState(false);

    const catalogState = useAnalysisCatalog();
    const today = useMemo(() => new Date(), []);
    const requestedType = parseType(searchParams.get("type"));
    const selectedRange = parseRange(searchParams.get("range"));

    useEffect(() => {
        const handleFullscreenChange = () => { setIsChartFullscreen(document.fullscreenElement === chartPanelRef.current); };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const fallbackType = useMemo(() => findFirstAvailableType(catalogState.data), [catalogState.data]);
    const resolvedType = useMemo(() => {
        if (requestedType && catalogState.data[requestedType].length > 0) return requestedType;
        return fallbackType;
    }, [catalogState.data, fallbackType, requestedType]);

    const instrumentOptions = catalogState.data[resolvedType];
    const requestedCode = searchParams.get("code") ?? "";
    const resolvedCode = useMemo(() => {
        if (instrumentOptions.some((option) => option.code === requestedCode)) return requestedCode;
        return instrumentOptions[0]?.code ?? "";
    }, [instrumentOptions, requestedCode]);
    const drawingInstrumentType = useMemo(() => toDrawingInstrumentType(resolvedType), [resolvedType]);
    const { drawings, loading: drawingsLoading, mutating: drawingsMutating, add: addDrawing, clearAll: clearAllInstrumentDrawings } = useDrawings(drawingInstrumentType, resolvedCode);

    const compareExtras = useMemo(
        () => sanitizeCompareCodes(searchParams.get("compare"), instrumentOptions, resolvedCode),
        [instrumentOptions, resolvedCode, searchParams],
    );

    useEffect(() => {
        if (compareExtras.length > 0) {
            const timer = window.setTimeout(() => setComparePanelOpen(true), 0);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [compareExtras.length]);

    useEffect(() => {
        const timer = window.setTimeout(() => { setDrawingDraft(null); setDrawingTool("select"); }, 0);
        return () => window.clearTimeout(timer);
    }, [drawingInstrumentType, resolvedCode]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setDrawingDraft(null); setDrawingTool("select"); } };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const rangeDates = useMemo(() => getRangeDates(selectedRange, today), [selectedRange, today]);

    const nextSearch = useMemo(() => {
        const params = new URLSearchParams(searchParams);
        params.set("type", resolvedType);
        params.set("range", selectedRange);
        if (resolvedCode) params.set("code", resolvedCode);
        else params.delete("code");
        if (compareExtras.length > 0) params.set("compare", compareExtras.join(","));
        else params.delete("compare");
        return params.toString();
    }, [compareExtras, resolvedCode, resolvedType, searchParams, selectedRange]);

    useEffect(() => {
        if (catalogState.loading) return;
        if (nextSearch === currentSearch) return;
        setSearchParams(new URLSearchParams(nextSearch), { replace: true });
    }, [catalogState.loading, currentSearch, nextSearch, setSearchParams]);

    const {
        isHistoryLoading, historyError, historyData, enrichedHistory, latestPoint, periodChange,
        dates, candlestickData, priceSeries, candlestickOverlays, candlestickClouds,
        isIndicatorHistoryLoading, indicatorHistoryError, metricCards, indicatorSnapshotCards,
    } = useAnalysisHistory({ resolvedType, resolvedCode, rangeDates, activeOverlayIndicators });

    const comparisonCodes = useMemo(() => (resolvedCode ? [resolvedCode, ...compareExtras] : []), [compareExtras, resolvedCode]);
    const {
        comparisonLoading, comparisonError, comparisonChart,
        availableCompareOptions, compareDraftCode, setCompareDraftCode,
    } = useAnalysisComparison({ comparePanelOpen, comparisonCodes, resolvedType, rangeDates, instrumentOptions });

    const candlestickTooltipIndicators = useMemo(
        () => candlestickOverlays
            .filter((item): item is typeof item & { values: Array<number | null> } => Boolean(item.values))
            .map((item) => ({ key: item.key, label: item.label, color: item.color, values: item.values!, formatter: (value: number) => formatValueByType(resolvedType, value) })),
        [candlestickOverlays, resolvedType],
    );

    const supportsCandlestick = resolvedType === "stocks";
    const effectiveChartType = supportsCandlestick ? chartType : "line";
    const chartLegendSeries = useMemo(() => [
        { key: "price", label: "Fiyat", color: CHART_COLORS.price },
        ...OVERLAY_INDICATOR_OPTIONS.filter((option) => activeOverlayIndicators.includes(option.key)).map((option) => ({ key: option.key, label: option.label, color: option.color })),
    ], [activeOverlayIndicators]);
    const drawingBusy = drawingsLoading || drawingsMutating;
    const drawingToolsDisabled = !supportsCandlestick || !resolvedCode || isHistoryLoading || enrichedHistory.length === 0;

    useEffect(() => {
        if (effectiveChartType !== "candle") {
            const timer = window.setTimeout(() => { setDrawingDraft(null); setDrawingTool("select"); }, 0);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [effectiveChartType]);

    const createDrawingRequest = (drawingType: DrawingType, drawingData: Record<string, unknown>): CreateDrawingRequest => {
        const style = DEFAULT_DRAWING_STYLE[drawingType];
        return { instrumentType: drawingInstrumentType, instrumentCode: resolvedCode, drawingType, drawingData: JSON.stringify(drawingData), color: style.color, lineWidth: style.lineWidth };
    };

    const handleDrawingToolSelect = (tool: DrawingTool) => {
        setDrawingDraft(null);
        if (tool === "select") { setDrawingTool("select"); return; }
        if (drawingToolsDisabled || drawingBusy) return;
        setChartType("candle");
        setDrawingTool(tool);
    };

    const handleDrawingPoint = async (point: ChartDrawingPoint) => {
        if (drawingTool === "select" || drawingToolsDisabled || drawingBusy) return;
        if (drawingTool === "HORIZONTAL_LINE") {
            try { await addDrawing(createDrawingRequest("HORIZONTAL_LINE", { price: point.price })); setDrawingDraft(null); setDrawingTool("select"); } catch { /* Toast is emitted by useDrawings. */ }
            return;
        }
        if (!drawingDraft) { setDrawingDraft(point); return; }
        const drawingType = drawingTool;
        try { await addDrawing(createDrawingRequest(drawingType, { points: [drawingDraft, point] })); setDrawingDraft(null); setDrawingTool("select"); } catch { /* Toast is emitted by useDrawings. */ }
    };

    const handleClearDrawings = async () => {
        if (drawingBusy || drawings.length === 0) return;
        if (!window.confirm("Tüm çizimleri silmek istediğinize emin misiniz?")) return;
        setDrawingDraft(null);
        try { await clearAllInstrumentDrawings(); setDrawingTool("select"); } catch { /* Toast is emitted by useDrawings. */ }
    };

    const toggleOverlayIndicator = (key: OverlayIndicatorKey) => {
        setActiveOverlayIndicators((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    };

    const latestDate = latestPoint?.date ?? historyData?.to ?? null;
    const selectedTypeMeta = TYPE_META[resolvedType];
    const selectedOption = useMemo(() => instrumentOptions.find((option) => option.code === resolvedCode) ?? null, [instrumentOptions, resolvedCode]);

    const updateSearchParam = (updater: (params: URLSearchParams) => void) => {
        const next = new URLSearchParams(searchParams);
        updater(next);
        setSearchParams(next);
    };

    const toggleChartFullscreen = async () => {
        const element = chartPanelRef.current;
        if (!element) return;
        try {
            if (document.fullscreenElement === element) { await document.exitFullscreen(); return; }
            await element.requestFullscreen();
        } catch { setIsChartFullscreen(false); }
    };

    const changeValue = periodChange ?? 0;

    return (
        <KapitalShell activePage="analysis" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <SectionPanel sx={{ mb: 3 }}>
                    <Stack direction={{ xs: "column", lg: "row" }} gap={3}>
                        <Box sx={{ flex: 1 }}>
                            <PageHeader
                                kicker="Tarihsel Veri ve Teknik Analiz"
                                title={resolvedCode || "Analiz"}
                                subtitle={`${selectedOption?.name ?? "Enstrüman seçin"}${selectedOption?.detail ? ` · ${selectedOption.detail}` : ""}`}
                                actions={
                                    <Chip
                                        label={`${formatPercent(changeValue)}  Seçili aralık değişimi`}
                                        color={changeValue > 0 ? "success" : changeValue < 0 ? "error" : "default"}
                                        variant="outlined"
                                        sx={{ fontWeight: 700 }}
                                    />
                                }
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                {selectedTypeMeta.description}{" "}
                                {rangeDates.from} ile {rangeDates.to} arasındaki veriler teknik indikatörler ve fiyat serisiyle birlikte izlenir.
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                value={resolvedType}
                                onChange={(_, val) => {
                                    if (!val) return;
                                    updateSearchParam((params) => {
                                        params.set("type", val as string);
                                        params.delete("compare");
                                        const nextCode = catalogState.data[val as typeof resolvedType][0]?.code;
                                        if (nextCode) params.set("code", nextCode);
                                        else params.delete("code");
                                    });
                                }}
                                size="small"
                                aria-label="Enstrüman türü"
                                sx={{ flexWrap: "wrap" }}
                            >
                                {TYPE_ORDER.map((type) => (
                                    <ToggleButton
                                        key={type}
                                        value={type}
                                        disabled={catalogState.data[type].length === 0}
                                        sx={{ gap: 0.75 }}
                                    >
                                        {TYPE_META[type].label}
                                        <Typography component="span" variant="caption" color="inherit" sx={{ opacity: 0.7 }}>
                                            {catalogState.data[type].length}
                                        </Typography>
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>

                        <Box sx={{ width: { xs: "100%", lg: 300 }, flexShrink: 0 }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Enstrüman Seçimi</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Kod ve zaman aralığı</Typography>
                                <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                                    <InputLabel id="analysis-code-label">Kod</InputLabel>
                                    <Select
                                        labelId="analysis-code-label"
                                        value={resolvedCode}
                                        label="Kod"
                                        onChange={(event: SelectChangeEvent) => {
                                            const nextCode = event.target.value;
                                            updateSearchParam((params) => {
                                                params.set("code", nextCode);
                                                const nextCompare = sanitizeCompareCodes(params.get("compare"), instrumentOptions, nextCode);
                                                if (nextCompare.length > 0) params.set("compare", nextCompare.join(","));
                                                else params.delete("compare");
                                            });
                                        }}
                                    >
                                        {instrumentOptions.map((option) => (
                                            <MenuItem key={option.code} value={option.code}>{option.code} · {option.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <ToggleButtonGroup
                                    exclusive
                                    value={selectedRange}
                                    onChange={(_, val) => { if (val) updateSearchParam((params) => params.set("range", val as string)); }}
                                    size="small"
                                    aria-label="Zaman aralığı seçimi"
                                    sx={{ flexWrap: "wrap", mb: 1.5 }}
                                >
                                    {RANGE_OPTIONS.map((option) => (
                                        <ToggleButton key={option.key} value={option.key}>{option.label}</ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                                <Stack sx={{ gap: 0.25 }}>
                                    {[
                                        { label: "Tür", value: selectedTypeMeta.label },
                                        { label: "Son veri", value: formatDateLabel(latestDate) },
                                        { label: "Veri noktası", value: String(enrichedHistory.length) },
                                    ].map(({ label, value }) => (
                                        <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        </Box>
                    </Stack>
                </SectionPanel>

                {catalogState.error ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <strong>Enstrüman listesi notu</strong> {catalogState.error}
                    </Alert>
                ) : null}

                <AnalysisMetricsBar cards={metricCards} isLoading={isHistoryLoading} latestDate={latestDate} />
                <AnalysisIndicatorSnapshot cards={indicatorSnapshotCards} />

                <Paper
                    component="section"
                    ref={(el: HTMLElement | null) => { chartPanelRef.current = el; }}
                    sx={{
                        p: { xs: 2, md: 3 },
                        border: "1px solid",
                        borderColor: "divider",
                        boxShadow: "0 14px 40px rgba(17,17,17,0.06)",
                        ...(isChartFullscreen && { bgcolor: "background.paper", overflowY: "auto" }),
                    }}
                >
                    <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
                        <Box>
                            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>ANA GRAFİK</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedOption?.name ?? "Tarihsel seri"}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Seçili aralıkta fiyat, hacim ve indikatör serileri birlikte gösterilir.
                            </Typography>
                        </Box>
                        <Stack direction="row" sx={{ gap: 1, flexShrink: 0 }}>
                            <IconButton
                                size="small"
                                onClick={() => void toggleChartFullscreen()}
                                aria-label={isChartFullscreen ? "Tam ekrandan çık" : "Grafiği tam ekran aç"}
                                title={isChartFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
                            >
                                {isChartFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                            </IconButton>
                            <Button
                                variant={comparePanelOpen ? "contained" : "outlined"}
                                color={comparePanelOpen ? "secondary" : "inherit"}
                                size="small"
                                onClick={() => setComparePanelOpen((value) => !value)}
                            >
                                {comparePanelOpen ? "Paneli Gizle" : "+ Karşılaştır"}
                            </Button>
                        </Stack>
                    </Stack>

                    <Stack sx={{ gap: 1.5, mb: 2 }}>
                        <Stack direction="row" sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                            {supportsCandlestick ? (
                                <ToggleButtonGroup
                                    exclusive
                                    value={chartType}
                                    onChange={(_, val: ChartType | null) => { if (val) setChartType(val); }}
                                    size="small"
                                    aria-label="Grafik türü"
                                >
                                    <ToggleButton value="line">Çizgi</ToggleButton>
                                    <ToggleButton value="candle">Mum</ToggleButton>
                                </ToggleButtonGroup>
                            ) : null}
                        </Stack>

                        {resolvedType === "stocks" ? (
                            <Box>
                                <Typography variant="caption" color="secondary" sx={{ fontWeight: 800, display: "block", mb: 0.5 }}>
                                    OVERLAY İNDİKATÖRLER
                                </Typography>
                                <ToggleButtonGroup
                                    value={activeOverlayIndicators}
                                    onChange={(_, vals: OverlayIndicatorKey[]) => setActiveOverlayIndicators(vals)}
                                    size="small"
                                    aria-label="Overlay indikatörler"
                                    sx={{ flexWrap: "wrap" }}
                                >
                                    {OVERLAY_INDICATOR_OPTIONS.map((option) => (
                                        <ToggleButton key={option.key} value={option.key}>{option.label}</ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Box>
                        ) : null}

                        {isIndicatorHistoryLoading ? (
                            <Alert severity="info" sx={{ py: 0.5 }}>İndikatörler yükleniyor — seçili sembol ve aralık için teknik seriler alınıyor.</Alert>
                        ) : indicatorHistoryError ? (
                            <Alert severity="warning" sx={{ py: 0.5 }}>İndikatör verisi alınamadı: {indicatorHistoryError}</Alert>
                        ) : null}

                        <Stack direction="row" sx={{ gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                            {chartLegendSeries.map((item) => (
                                <Stack key={item.key} direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                                    <Typography variant="caption">{item.label}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>

                    {isHistoryLoading ? (
                        <Alert severity="info">Grafik yükleniyor — tarihsel veri alınıyor.</Alert>
                    ) : historyError ? (
                        <Alert severity="error"><strong>Veri alınamadı</strong> {historyError}</Alert>
                    ) : enrichedHistory.length === 0 ? (
                        <Alert severity="info">Seçili aralıkta veri yok — farklı bir zaman aralığı veya enstrüman deneyin.</Alert>
                    ) : effectiveChartType === "candle" ? (
                        <Box>
                            {supportsCandlestick ? (
                                <DrawingToolbar activeTool={drawingTool} toolDisabled={drawingToolsDisabled} busy={drawingBusy} canClear={drawings.length > 0} onSelect={handleDrawingToolSelect} onClear={handleClearDrawings} />
                            ) : null}
                            <CandlestickChart
                                key={`candle-${resolvedType}-${resolvedCode}-${selectedRange}-${activeOverlayIndicators.join(",")}`}
                                data={candlestickData}
                                overlays={candlestickOverlays}
                                clouds={candlestickClouds}
                                tooltipIndicators={candlestickTooltipIndicators}
                                drawings={drawings}
                                drawingMode={drawingTool}
                                drawingDraft={drawingDraft}
                                onDrawingPoint={handleDrawingPoint}
                                emptyLabel="Seçili aralıkta gösterilecek fiyat verisi bulunamadı."
                                valueFormatter={(value) => formatValueByType(resolvedType, value)}
                                volumeFormatter={formatCompactNumber}
                            />
                        </Box>
                    ) : (
                        <Box>
                            <LineChart
                                dates={dates}
                                series={priceSeries}
                                emptyLabel="Seçili aralıkta gösterilecek fiyat verisi bulunamadı."
                                yFormatter={(value) => formatValueByType(resolvedType, value)}
                                fixedDomain={undefined}
                                referenceLines={[]}
                                tooltipData={enrichedHistory}
                                valueFormatter={(value) => formatValueByType(resolvedType, value)}
                                volumeFormatter={formatCompactNumber}
                            />
                        </Box>
                    )}

                    {comparePanelOpen ? (
                        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                            <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", gap: 1, mb: 2 }}>
                                <Box>
                                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Karşılaştırma Paneli</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Normalize % bazlı grafik</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">Ana seri dahil en fazla 3 enstrüman kullanılır.</Typography>
                            </Stack>

                            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 2 }}>
                                {comparisonCodes.map((code, index) => {
                                    const option = instrumentOptions.find((item) => item.code === code);
                                    const isPrimary = index === 0;
                                    return (
                                        <Chip
                                            key={code}
                                            label={`${code} · ${option?.name ?? code}${isPrimary ? " (Ana seri)" : ""}`}
                                            color={isPrimary ? "secondary" : "default"}
                                            variant={isPrimary ? "filled" : "outlined"}
                                            onDelete={isPrimary ? undefined : () => updateSearchParam((params) => {
                                                const nextCompare = compareExtras.filter((item) => item !== code);
                                                if (nextCompare.length > 0) params.set("compare", nextCompare.join(","));
                                                else params.delete("compare");
                                            })}
                                        />
                                    );
                                })}
                            </Stack>

                            <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, alignItems: { sm: "center" }, mb: 2 }}>
                                <FormControl size="small" sx={{ minWidth: 220 }}>
                                    <InputLabel id="compare-code-label">Yeni enstrüman</InputLabel>
                                    <Select
                                        labelId="compare-code-label"
                                        value={compareDraftCode}
                                        label="Yeni enstrüman"
                                        onChange={(event: SelectChangeEvent) => setCompareDraftCode(event.target.value)}
                                        disabled={comparisonCodes.length >= 3 || availableCompareOptions.length === 0}
                                    >
                                        {availableCompareOptions.length === 0 ? (
                                            <MenuItem value="" disabled>Eklenebilir enstrüman yok</MenuItem>
                                        ) : availableCompareOptions.map((option) => (
                                            <MenuItem key={option.code} value={option.code}>{option.code} · {option.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    disabled={comparisonCodes.length >= 3 || compareDraftCode.length === 0 || !availableCompareOptions.some((option) => option.code === compareDraftCode)}
                                    onClick={() => updateSearchParam((params) => {
                                        const nextCompare = [...compareExtras, compareDraftCode].slice(0, 2);
                                        if (nextCompare.length > 0) params.set("compare", nextCompare.join(","));
                                    })}
                                >
                                    Ekle
                                </Button>
                            </Stack>

                            {comparisonCodes.length <= 1 ? (
                                <Alert severity="info">Karşılaştırma hazır — grafik için aynı türden en az bir enstrüman daha ekleyin.</Alert>
                            ) : comparisonLoading ? (
                                <Alert severity="info">Karşılaştırma yükleniyor — seçili enstrümanlar için normalize seri hazırlanıyor.</Alert>
                            ) : comparisonError ? (
                                <Alert severity="error"><strong>Karşılaştırma verisi alınamadı</strong> {comparisonError}</Alert>
                            ) : (
                                <>
                                    <Stack direction="row" sx={{ gap: 1.5, flexWrap: "wrap", mb: 1 }}>
                                        {comparisonChart.series.map((item) => (
                                            <Stack key={item.key} direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                                                <Typography variant="caption">{item.key}</Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                    <LineChart
                                        dates={comparisonChart.dates}
                                        series={comparisonChart.series}
                                        emptyLabel="Karşılaştırma serileri hazır değil."
                                        yFormatter={(value) => `${value > 0 ? "+" : ""}${formatDecimal(value, 2)}%`}
                                        referenceLines={[{ value: 0, label: "0%", color: "rgba(17,17,17,0.28)" }]}
                                    />
                                </>
                            )}
                        </Box>
                    ) : null}
                </Paper>
            </Box>
        </KapitalShell>
    );
}
