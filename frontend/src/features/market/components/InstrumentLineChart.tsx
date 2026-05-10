import { Box, Typography } from "@mui/material";
import { formatNumber } from "../utils/marketFormatters";
import { getTickIndexes, getLinearTicks, createLinePath } from "../utils/instrumentSummary";
import { formatShortDate } from "../utils/marketFormatters";
import type { ChartSeries } from "../types";

type Props = {
    dates: string[];
    series: ChartSeries[];
    emptyLabel: string;
    yFormatter?: (value: number) => string;
};

const CHART_AXIS_STYLE = {
    fill: "rgba(17, 17, 17, 0.46)",
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
} as const;

export function InstrumentLineChart({ dates, series, emptyLabel, yFormatter }: Props) {
    const width = 960;
    const height = 340;
    const padding = { top: 20, right: 18, bottom: 34, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const values = series.flatMap((item) => item.values).filter((v): v is number => v !== null);

    if (values.length === 0) {
        return (
            <Box
                sx={{
                    mt: 2.25,
                    borderRadius: "24px",
                    border: "1px dashed",
                    borderColor: "divider",
                    bgcolor: "rgba(255, 255, 255, 0.5)",
                    p: 3,
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Grafik hazır değil</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>{emptyLabel}</Typography>
            </Box>
        );
    }

    let minimum = Math.min(...values);
    let maximum = Math.max(...values);

    const span = maximum - minimum;
    const paddingValue = span === 0 ? Math.max(Math.abs(maximum) * 0.08, 1) : span * 0.12;
    minimum -= paddingValue;
    maximum += paddingValue;

    if (minimum === maximum) {
        minimum -= 1;
        maximum += 1;
    }

    const xAt = (index: number) => padding.left + (index / Math.max(dates.length - 1, 1)) * innerWidth;
    const yAt = (value: number) => padding.top + ((maximum - value) / (maximum - minimum)) * innerHeight;

    const xTicks = getTickIndexes(dates.length, Math.min(5, dates.length));
    const yTicks = getLinearTicks(minimum, maximum, 5);

    return (
        <Box
            sx={{
                mt: 2.25,
                borderRadius: "24px",
                border: "1px solid",
                borderColor: "divider",
                background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(245, 243, 239, 0.96)), radial-gradient(circle at top right, rgba(193, 98, 47, 0.08), transparent 28%)",
                p: 1.75,
                overflow: "hidden",
            }}
        >
            <Box
                component="svg"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                role="img"
                sx={{ display: "block", width: "100%", height: { xs: 280, md: 340 } }}
            >
                <defs>
                    <linearGradient id="detail-grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(17,17,17,0.16)" />
                        <stop offset="100%" stopColor="rgba(17,17,17,0.04)" />
                    </linearGradient>
                </defs>

                <rect
                    x={padding.left}
                    y={padding.top}
                    width={innerWidth}
                    height={innerHeight}
                    rx="18"
                    fill="rgba(255,255,255,0.74)"
                />

                {yTicks.map((tick) => (
                    <g key={`y-${tick.toFixed(4)}`}>
                        <line
                            x1={padding.left}
                            y1={yAt(tick)}
                            x2={width - padding.right}
                            y2={yAt(tick)}
                            stroke="url(#detail-grid-fade)"
                            strokeWidth="1"
                        />
                        <text {...CHART_AXIS_STYLE} x={padding.left - 10} y={yAt(tick) + 4} textAnchor="end">
                            {yFormatter ? yFormatter(tick) : formatNumber(tick, 2)}
                        </text>
                    </g>
                ))}

                {series.map((item) => {
                    const path = createLinePath(item.values, xAt, yAt);
                    if (!path) return null;

                    return (
                        <path
                            key={item.key}
                            d={path}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="2.6"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    );
                })}

                {xTicks.map((tickIndex) => (
                    <text
                        key={`x-${tickIndex}`}
                        {...CHART_AXIS_STYLE}
                        x={xAt(tickIndex)}
                        y={height - 10}
                        textAnchor={tickIndex === 0 ? "start" : tickIndex === dates.length - 1 ? "end" : "middle"}
                    >
                        {formatShortDate(dates[tickIndex])}
                    </text>
                ))}
            </Box>
        </Box>
    );
}
