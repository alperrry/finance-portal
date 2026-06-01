import { Box, Typography } from "@mui/material";
import type { InstrumentMetricCard } from "../types";

type Props = {
    metricCards: InstrumentMetricCard[];
};

const CARD_SX = {
    border: "1px solid",
    borderColor: "divider",
    bgcolor: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.76)" : "rgba(255, 255, 255, 0.76)",
    boxShadow: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "0 16px 48px rgba(0, 0, 0, 0.32)" : "0 16px 48px rgba(17, 17, 17, 0.06)",
    backdropFilter: "blur(16px)",
    borderRadius: "24px",
    p: "22px",
};

export function InstrumentMetrics({ metricCards }: Props) {
    if (metricCards.length === 0) return null;

    return (
        <Box
            component="section"
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, minmax(0, 1fr))" },
                gap: 1.75,
            }}
        >
            {metricCards.map((metric) => (
                <Box key={metric.label} component="article" sx={CARD_SX}>
                    <Typography
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontSize: 10,
                            color: "text.secondary",
                        }}
                    >
                        {metric.label}
                    </Typography>
                    <Typography
                        sx={{
                            mt: 1.75,
                            fontSize: "clamp(24px, 3vw, 32px)",
                            lineHeight: 1,
                            letterSpacing: "-0.04em",
                            fontWeight: 700,
                        }}
                    >
                        {metric.value}
                    </Typography>
                    <Typography sx={{ mt: 1.5, fontSize: 12, color: "text.secondary" }}>
                        {metric.note}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
