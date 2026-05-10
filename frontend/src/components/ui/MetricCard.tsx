import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type MetricTone = "neutral" | "up" | "down";

type MetricCardProps = {
    label: string;
    value: ReactNode;
    note?: ReactNode;
    tone?: MetricTone;
};

const toneColor: Record<MetricTone, string> = {
    neutral: "text.secondary",
    up: "success.main",
    down: "error.main",
};

export function MetricCard({ label, value, note, tone = "neutral" }: MetricCardProps) {
    return (
        <Card>
            <CardContent>
                <Stack sx={{ gap: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                        {label}
                    </Typography>
                    <Typography variant="h5" component="div" color={toneColor[tone]} sx={{ fontWeight: 900 }}>
                        {value}
                    </Typography>
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
