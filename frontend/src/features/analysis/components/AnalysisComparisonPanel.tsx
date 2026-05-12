import { Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { AnalysisLineChart as LineChart } from "./LightweightLineChart";
import type { AnalysisPageState } from "../hooks/useAnalysisPage";
import { formatDecimal } from "../utils/analysisFormatters";

interface AnalysisComparisonPanelProps {
    page: AnalysisPageState;
}

export function AnalysisComparisonPanel({ page }: AnalysisComparisonPanelProps) {
    const { selection, comparison, handlers } = page;

    return (
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", gap: 1, mb: 2 }}>
                <Box>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Karşılaştırma Paneli</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Normalize % bazlı grafik</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Ana seri dahil en fazla 3 enstrüman kullanılır.</Typography>
            </Stack>

            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 2 }}>
                {selection.comparisonCodes.map((code, index) => {
                    const option = selection.instrumentOptions.find((item) => item.code === code);
                    const isPrimary = index === 0;
                    return (
                        <Chip
                            key={code}
                            label={`${code} · ${option?.name ?? code}${isPrimary ? " (Ana seri)" : ""}`}
                            color={isPrimary ? "secondary" : "default"}
                            variant={isPrimary ? "filled" : "outlined"}
                            onDelete={isPrimary ? undefined : () => handlers.updateSearchParam((params) => {
                                const nextCompare = selection.compareExtras.filter((item) => item !== code);
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
                        value={comparison.compareDraftCode}
                        label="Yeni enstrüman"
                        onChange={(event: SelectChangeEvent) => handlers.setCompareDraftCode(event.target.value)}
                        disabled={selection.comparisonCodes.length >= 3 || comparison.availableCompareOptions.length === 0}
                    >
                        {comparison.availableCompareOptions.length === 0 ? (
                            <MenuItem value="" disabled>Eklenebilir enstrüman yok</MenuItem>
                        ) : comparison.availableCompareOptions.map((option) => (
                            <MenuItem key={option.code} value={option.code}>{option.code} · {option.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    disabled={selection.comparisonCodes.length >= 3 || comparison.compareDraftCode.length === 0 || !comparison.availableCompareOptions.some((option) => option.code === comparison.compareDraftCode)}
                    onClick={() => handlers.updateSearchParam((params) => {
                        const nextCompare = [...selection.compareExtras, comparison.compareDraftCode].slice(0, 2);
                        if (nextCompare.length > 0) params.set("compare", nextCompare.join(","));
                    })}
                >
                    Ekle
                </Button>
            </Stack>

            {selection.comparisonCodes.length <= 1 ? (
                <Alert severity="info">Karşılaştırma hazır — grafik için aynı türden en az bir enstrüman daha ekleyin.</Alert>
            ) : comparison.comparisonLoading ? (
                <Alert severity="info">Karşılaştırma yükleniyor — seçili enstrümanlar için normalize seri hazırlanıyor.</Alert>
            ) : comparison.comparisonError ? (
                <Alert severity="error"><strong>Karşılaştırma verisi alınamadı</strong> {comparison.comparisonError}</Alert>
            ) : (
                <>
                    <Stack direction="row" sx={{ gap: 1.5, flexWrap: "wrap", mb: 1 }}>
                        {comparison.comparisonChart.series.map((item) => (
                            <Stack key={item.key} direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                                <Typography variant="caption">{item.key}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <LineChart
                        dates={comparison.comparisonChart.dates}
                        series={comparison.comparisonChart.series}
                        emptyLabel="Karşılaştırma serileri hazır değil."
                        yFormatter={(value) => `${value > 0 ? "+" : ""}${formatDecimal(value, 2)}%`}
                        referenceLines={[{ value: 0, label: "0%", color: "rgba(17,17,17,0.28)" }]}
                    />
                </>
            )}
        </Box>
    );
}
