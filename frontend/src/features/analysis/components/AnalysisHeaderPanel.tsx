import { Alert, Box, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import type { AnalysisPageState } from "../hooks/useAnalysisPage";
import { ANALYSIS_RANGE_I18N_KEY, RANGE_OPTIONS, TYPE_I18N_KEY, TYPE_ORDER } from "../types";
import {
    formatDateLabel,
    formatPercent,
    sanitizeCompareCodes,
} from "../utils/analysisFormatters";

interface AnalysisHeaderPanelProps {
    page: AnalysisPageState;
}

export function AnalysisHeaderPanel({ page }: AnalysisHeaderPanelProps) {
    const { t } = useTranslation();
    const {
        catalog,
        selection,
        history,
        handlers,
    } = page;
    const selectedTypeI18nKey = TYPE_I18N_KEY[selection.resolvedType];
    const selectedTypeLabel = t(`analysis.types.${selectedTypeI18nKey}.label` as any) as string;
    const selectedTypeDescription = t(`analysis.types.${selectedTypeI18nKey}.description` as any) as string;
    const changeValue = history.periodChange ?? 0;

    return (
        <>
            <SectionPanel sx={{ mb: 3 }}>
                <Stack direction={{ xs: "column", lg: "row" }} sx={{ gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                        <PageHeader
                            kicker={t("analysis.header.kicker")}
                            title={selection.resolvedCode || t("analysis.header.defaultTitle")}
                            subtitle={`${selection.selectedOption?.name ?? t("analysis.header.selectInstrument")}${selection.selectedOption?.detail ? ` · ${selection.selectedOption.detail}` : ""}`}
                            actions={
                                <Chip
                                    label={`${formatPercent(changeValue)}  ${t("analysis.header.rangeChange")}`}
                                    color={changeValue > 0 ? "success" : changeValue < 0 ? "error" : "default"}
                                    variant="outlined"
                                    sx={{ fontWeight: 700 }}
                                />
                            }
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                            {selectedTypeDescription}{" "}
                            {t("analysis.header.rangeInfo", { from: selection.rangeDates.from, to: selection.rangeDates.to })}
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
                            aria-label={t("analysis.header.typeToggleAriaLabel")}
                            sx={{ flexWrap: "wrap" }}
                        >
                            {TYPE_ORDER.map((type) => {
                                const typeLabel = t(`analysis.types.${TYPE_I18N_KEY[type]}.label` as any) as string;
                                return (
                                    <ToggleButton
                                        key={type}
                                        value={type}
                                        disabled={catalog.data[type].length === 0}
                                        sx={{ gap: 0.75 }}
                                    >
                                        {typeLabel}
                                        <Typography component="span" variant="caption" color="inherit" sx={{ opacity: 0.7 }}>
                                            {catalog.data[type].length}
                                        </Typography>
                                    </ToggleButton>
                                );
                            })}
                        </ToggleButtonGroup>
                    </Box>

                    <Box sx={{ width: { xs: "100%", lg: 300 }, flexShrink: 0 }}>
                        <AnalysisInstrumentControls page={page} selectedTypeLabel={selectedTypeLabel} />
                    </Box>
                </Stack>
            </SectionPanel>

            {catalog.error ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>{t("analysis.header.listNote")}</strong> {catalog.error}
                </Alert>
            ) : null}
        </>
    );
}

function AnalysisInstrumentControls({ page, selectedTypeLabel }: AnalysisHeaderPanelProps & { selectedTypeLabel: string }) {
    const { t } = useTranslation();
    const { selection, history, handlers } = page;

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("analysis.instrument.selectionOverline")}</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>{t("analysis.instrument.selectionHeading")}</Typography>
            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                <InputLabel id="analysis-code-label">{t("analysis.instrument.codeLabel")}</InputLabel>
                <Select
                    labelId="analysis-code-label"
                    value={selection.resolvedCode}
                    label={t("analysis.instrument.codeLabel")}
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
                aria-label={t("analysis.instrument.rangeAriaLabel")}
                sx={{ flexWrap: "wrap", mb: 1.5 }}
            >
                {RANGE_OPTIONS.map((option) => {
                    const rangeLabel = t(`market.chart.range.${ANALYSIS_RANGE_I18N_KEY[option.key]}` as any) as string;
                    return (
                        <ToggleButton key={option.key} value={option.key}>{rangeLabel}</ToggleButton>
                    );
                })}
            </ToggleButtonGroup>
            <Stack sx={{ gap: 0.25 }}>
                {[
                    { label: t("analysis.instrument.typeLabel"), value: selectedTypeLabel },
                    { label: t("analysis.instrument.latestDataLabel"), value: formatDateLabel(selection.latestDate) },
                    { label: t("analysis.instrument.dataPointsLabel"), value: String(history.enrichedHistory.length) },
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
