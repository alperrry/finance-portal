import { Paper, Typography } from "@mui/material";

interface MetricProps {
    label: string;
    value: string;
}

export function Metric({ label, value }: MetricProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: "18px",
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "rgba(255,255,255,0.7)",
            }}
        >
            <Typography
                sx={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                    fontFamily: '"JetBrains Mono", monospace',
                }}
            >
                {label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
                {value}
            </Typography>
        </Paper>
    );
}