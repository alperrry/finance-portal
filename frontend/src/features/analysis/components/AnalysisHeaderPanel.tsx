import { Alert, Box, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import type { AnalysisPageState } from "../hooks/useAnalysisPage";
import { RANGE_OPTIONS, TYPE_META, TYPE_ORDER } from "../types";
import {
    formatDateLabel,
    formatPercent,
    sanitizeCompareCodes,
} from "../utils/analysisFormatters";

interface AnalysisHeaderPanelProps {
    page: AnalysisPageState;
}

export function AnalysisHeaderPanel({ page }: AnalysisHeaderPanelProps) {
    const {
        catalog,
        selection,
        history,
        handlers,
    } = page;
    const selectedTypeMeta = TYPE_META[selection.resolvedType];
    const changeValue = history.periodChange ?? 0;

    return (
        <>
            <SectionPanel sx={{ mb: 3 }}>
                <Stack direction={{ xs: "column", lg: "row" }} sx={{ gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                        <PageHeader
                            kicker="Tarihsel Veri ve Teknik Analiz"
                            title={selection.resolvedCode || "Analiz"}
                            subtitle={`${selection.selectedOption?.name ?? "Enstrüman seçin"}${selection.selectedOption?.detail ? ` · ${selection.selectedOption.detail}` : ""}`}
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
                            {selection.rangeDates.from} ile {selection.rangeDates.to} arasındaki veriler teknik indikatörler ve fiyat serisiyle birlikte izlenir.
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            value={selection.resolvedType}
                            onChange={(_, val) => {
                                if (!val) return;
                                handlers.updateSearchParam((params) => {
                                    params.set("type", val as string);
                                    params.delete("compare");
                                    const nextCode = catalog.data[val as typeof selection.resolvedType][0]?.code;
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
                                    disabled={catalog.data[type].length === 0}
                                    sx={{ gap: 0.75 }}
                                >
                                    {TYPE_META[type].label}
                                    <Typography component="span" variant="caption" color="inherit" sx={{ opacity: 0.7 }}>
                                        {catalog.data[type].length}
                                    </Typography>
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>

                    <Box sx={{ width: { xs: "100%", lg: 300 }, flexShrink: 0 }}>
                        <AnalysisInstrumentControls page={page} />
                    </Box>
                </Stack>
            </SectionPanel>

            {catalog.error ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Enstrüman listesi notu</strong> {catalog.error}
                </Alert>
            ) : null}
        </>
    );
}

function AnalysisInstrumentControls({ page }: AnalysisHeaderPanelProps) {
    const { selection, history, handlers } = page;
    const selectedTypeMeta = TYPE_META[selection.resolvedType];

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Enstrüman Seçimi</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Kod ve zaman aralığı</Typography>
            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                <InputLabel id="analysis-code-label">Kod</InputLabel>
                <Select
                    labelId="analysis-code-label"
                    value={selection.resolvedCode}
                    label="Kod"
                    onChange={(event: SelectChangeEvent) => {
                        const nextCode = event.target.value;
                        handlers.updateSearchParam((params) => {
                            params.set("code", nextCode);
                            const nextCompare = sanitizeCompareCodes(params.get("compare"), selection.instrumentOptions, nextCode);
                            if (nextCompare.length > 0) params.set("compare", nextCompare.join(","));
                            else params.delete("compare");
                        });
                    }}
                >
                    {selection.instrumentOptions.map((option) => (
                        <MenuItem key={option.code} value={option.code}>{option.code} · {option.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <ToggleButtonGroup
                exclusive
                value={selection.selectedRange}
                onChange={(_, val) => {
                    if (val) handlers.updateSearchParam((params) => params.set("range", val as string));
                }}
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
                    { label: "Son veri", value: formatDateLabel(selection.latestDate) },
                    { label: "Veri noktası", value: String(history.enrichedHistory.length) },
                ].map(({ label, value }) => (
                    <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}</Typography>
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
}
