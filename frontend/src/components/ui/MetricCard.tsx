import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type MetricTone = "neutral" | "up" | "down";

type MetricCardProps = {
    label: string;
    value: ReactNode;
    note?: ReactNode;
    tone?: MetricTone;
    /** Opsiyonel yüzde/değişim rozeti (ör. "+12,34%"). Tona göre renklenir. */
    delta?: ReactNode;
};

const valueColor: Record<MetricTone, string> = {
    neutral: "text.primary",
    up: "success.main",
    down: "error.main",
};

// Yüzde rozeti için yalnızca hafif tint (kart zemini nötr kalır, sayı öne çıksın).
const pillBg: Record<MetricTone, string> = {
    neutral: "action.hover",
    up: "rgba(46, 125, 50, 0.10)",
    down: "rgba(211, 47, 47, 0.10)",
};

export function MetricCard({ label, value, note, tone = "neutral", delta }: MetricCardProps) {
    return (
        <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
                <Stack sx={{ gap: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {label}
                    </Typography>
                    <Typography
                        component="div"
                        color={valueColor[tone]}
                        sx={{ fontWeight: 900, lineHeight: 1.2, fontSize: "1.25rem", overflowWrap: "anywhere" }}
                    >
                        {value}
                    </Typography>
                    {delta != null && delta !== "" ? (
                        <Box
                            sx={{
                                display: "inline-flex",
                                alignSelf: "flex-start",
                                alignItems: "center",
                                px: 0.85,
                                py: 0.2,
                                borderRadius: 1,
                                bgcolor: pillBg[tone],
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1, color: valueColor[tone] }}>
                                {delta}
                            </Typography>
                        </Box>
                    ) : null}
                    {note ? (
                        <Typography variant="body2" color="text.secondary">
                            {note}
                        </Typography>
                    ) : null}
                </Stack>
            </CardContent>
        </Card>
    );
}
