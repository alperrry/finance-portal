import { useEffect, useRef, useState, type PointerEvent } from "react";

export type ChartSeries = {
    key: string;
    label: string;
    color: string;
    values: Array<number | null>;
    strokeWidth?: number;
    dashArray?: string;
};

export type ReferenceLine = {
    value: number;
    label: string;
    color?: string;
    dashArray?: string;
};

type TooltipPoint = {
    close: number | null;
    volume: number | null;
};

type AnalysisLineChartProps = {
    dates: string[];
    series: ChartSeries[];
    emptyLabel: string;
    yFormatter?: (value: number) => string;
    fixedDomain?: [number, number];
    referenceLines?: ReferenceLine[];
    tooltipData?: TooltipPoint[];
    valueFormatter?: (value: number | null | undefined) => string;
    volumeFormatter?: (value: number | null | undefined) => string;
};

type LineTooltipState = {
    visible: boolean;
    index: number;
    x: number;
    y: number;
    frameWidth: number;
    frameHeight: number;
    chartX: number;
    chartY: number;
    valueAtY: number;
};

const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
});

function toSafeNumber(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatDecimal(value: number | null | undefined, digits = 2) {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
}

function formatCompactNumber(value: number | null | undefined) {
    const normalized = toSafeNumber(value);
    if (normalized === null) return "-";

    const absolute = Math.abs(normalized);
    if (absolute >= 1_000_000_000) return `${formatDecimal(normalized / 1_000_000_000, 1)} Mr`;
    if (absolute >= 1_000_000) return `${formatDecimal(normalized / 1_000_000, 1)} Mn`;
    if (absolute >= 1_000) return `${formatDecimal(normalized / 1_000, 1)} Bin`;
    return formatDecimal(normalized, 0);
}

function formatFullDateLabel(value: string | null | undefined) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatShortDateLabel(value: string | null | undefined) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return shortDateFormatter.format(date);
}

function getTickIndexes(length: number, tickCount: number) {
    if (length <= 0) return [];
    if (length <= tickCount) return Array.from({ length }, (_, index) => index);

    const lastIndex = length - 1;
    return Array.from({ length: tickCount }, (_, index) => Math.round((index / (tickCount - 1)) * lastIndex));
}

function getLinearTicks(minimum: number, maximum: number, count: number) {
    if (count <= 1) return [minimum];

    const step = (maximum - minimum) / (count - 1);
    return Array.from({ length: count }, (_, index) => minimum + step * index);
}

function createLinePath(values: Array<number | null>, xAt: (index: number) => number, yAt: (value: number) => number) {
    return values.reduce((path, value, index) => {
        if (value === null) return path;
        const command = path ? "L" : "M";
        return `${path} ${command}${xAt(index).toFixed(2)} ${yAt(value).toFixed(2)}`.trim();
    }, "");
}

export function AnalysisLineChart({
    dates,
    series,
    emptyLabel,
    yFormatter,
    fixedDomain,
    referenceLines = [],
    tooltipData = [],
    valueFormatter,
    volumeFormatter = formatCompactNumber,
}: AnalysisLineChartProps) {
    const frameRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [tooltip, setTooltip] = useState<LineTooltipState | null>(null);
    const tooltipRafRef = useRef<number | null>(null);
    const pendingTooltipRef = useRef<LineTooltipState | null>(null);
    const width = 960;
    const height = 340;
    const padding = { top: 20, right: 18, bottom: 34, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const formatTooltipValue = valueFormatter ?? ((value) => formatDecimal(value, 2));

    const scheduleTooltip = (nextTooltip: LineTooltipState | null) => {
        pendingTooltipRef.current = nextTooltip;
        if (tooltipRafRef.current !== null) return;

        tooltipRafRef.current = window.requestAnimationFrame(() => {
            tooltipRafRef.current = null;
            setTooltip(pendingTooltipRef.current);
            pendingTooltipRef.current = null;
        });
    };

    useEffect(
        () => () => {
            if (tooltipRafRef.current !== null) {
                window.cancelAnimationFrame(tooltipRafRef.current);
            }
        },
        [],
    );

    const values = series.flatMap((item) => item.values).filter((value): value is number => value !== null);
    const extraValues = referenceLines.map((line) => line.value);
    const domainValues = [...values, ...extraValues];

    if (domainValues.length === 0) {
        return (
            <div className="analysis-chart-empty">
                <strong>Grafik hazır değil</strong>
                <span>{emptyLabel}</span>
            </div>
        );
    }

    let minimum = fixedDomain ? fixedDomain[0] : Math.min(...domainValues);
    let maximum = fixedDomain ? fixedDomain[1] : Math.max(...domainValues);

    if (!fixedDomain) {
        const span = maximum - minimum;
        const paddingValue = span === 0 ? Math.max(Math.abs(maximum) * 0.08, 1) : span * 0.12;
        minimum -= paddingValue;
        maximum += paddingValue;
    }

    if (minimum === maximum) {
        minimum -= 1;
        maximum += 1;
    }

    const xAt = (index: number) =>
        padding.left + (index / Math.max(dates.length - 1, 1)) * innerWidth;

    const yAt = (value: number) =>
        padding.top + ((maximum - value) / (maximum - minimum)) * innerHeight;

    const xTicks = getTickIndexes(dates.length, Math.min(5, dates.length));
    const yTicks = getLinearTicks(minimum, maximum, 5);
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const updateTooltipFromPointer = (event: PointerEvent<SVGSVGElement>, toggleTouch = false) => {
        const svg = svgRef.current;
        const frame = frameRef.current;
        if (!svg || !frame || dates.length === 0) return;

        const svgRect = svg.getBoundingClientRect();
        const frameRect = frame.getBoundingClientRect();
        if (svgRect.width <= 0 || svgRect.height <= 0) return;

        const viewX = ((event.clientX - svgRect.left) / svgRect.width) * width;
        const viewY = ((event.clientY - svgRect.top) / svgRect.height) * height;
        const rawIndex = Math.round(((viewX - padding.left) / innerWidth) * Math.max(dates.length - 1, 1));
        const index = clamp(rawIndex, 0, dates.length - 1);

        if (toggleTouch && tooltip?.index === index) {
            scheduleTooltip(null);
            return;
        }

        const chartX = xAt(index);
        const chartY = clamp(viewY, padding.top, padding.top + innerHeight);
        const valueAtY = maximum - ((chartY - padding.top) / innerHeight) * (maximum - minimum);

        scheduleTooltip({
            visible: true,
            index,
            x: event.clientX - frameRect.left,
            y: event.clientY - frameRect.top,
            frameWidth: frameRect.width,
            frameHeight: frameRect.height,
            chartX,
            chartY,
            valueAtY,
        });
    };

    const tooltipPoint = tooltip ? tooltipData[tooltip.index] : undefined;
    const tooltipSeriesRows = tooltip
        ? series
              .map((item) => ({
                  key: item.key,
                  label: item.label,
                  color: item.color,
                  value: item.values[tooltip.index],
              }))
              .filter((item): item is { key: string; label: string; color: string; value: number } => item.value !== null)
        : [];

    const tooltipIndicatorRows = tooltipPoint ? tooltipSeriesRows.filter((row) => row.key !== "close") : [];
    const tooltipWidth = 232;
    const tooltipHeight = tooltipPoint ? 150 + tooltipIndicatorRows.length * 19 : 70 + tooltipSeriesRows.length * 19;
    const tooltipX =
        tooltip
            ? clamp(
                  tooltip.x > tooltip.frameWidth / 2 ? tooltip.x - tooltipWidth - 16 : tooltip.x + 16,
                  8,
                  Math.max(8, tooltip.frameWidth - tooltipWidth - 8),
              )
            : 0;
    const tooltipY =
        tooltip
            ? clamp(
                  tooltip.y > tooltip.frameHeight / 2 ? tooltip.y - tooltipHeight - 16 : tooltip.y + 16,
                  8,
                  Math.max(8, tooltip.frameHeight - tooltipHeight - 8),
              )
            : 0;
    const priceLabel = tooltip ? (yFormatter ? yFormatter(tooltip.valueAtY) : formatTooltipValue(tooltip.valueAtY)) : "";
    const dateLabel = tooltip ? formatShortDateLabel(dates[tooltip.index]) : "";
    const dateLabelX = tooltip ? clamp(tooltip.chartX - 32, padding.left, width - padding.right - 64) : 0;

    return (
        <div ref={frameRef} className="analysis-chart-frame analysis-line-chart-frame">
            <svg
                ref={svgRef}
                className="analysis-chart-svg"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                role="img"
                onPointerMove={(event) => {
                    if (event.pointerType === "mouse") updateTooltipFromPointer(event);
                }}
                onPointerDown={(event) => {
                    if (event.pointerType !== "mouse") updateTooltipFromPointer(event, true);
                }}
                onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") scheduleTooltip(null);
                }}
            >
                <defs>
                    <linearGradient id="analysis-grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(17,17,17,0.16)" />
                        <stop offset="100%" stopColor="rgba(17,17,17,0.04)" />
                    </linearGradient>
                </defs>

                <rect x={padding.left} y={padding.top} width={innerWidth} height={innerHeight} rx="18" fill="rgba(255,255,255,0.74)" />

                {yTicks.map((tick) => (
                    <g key={`y-${tick.toFixed(4)}`}>
                        <line x1={padding.left} y1={yAt(tick)} x2={width - padding.right} y2={yAt(tick)} stroke="url(#analysis-grid-fade)" strokeWidth="1" />
                        <text className="analysis-chart-axis" x={padding.left - 10} y={yAt(tick) + 4} textAnchor="end">
                            {yFormatter ? yFormatter(tick) : formatDecimal(tick, 2)}
                        </text>
                    </g>
                ))}

                {referenceLines.map((line) => (
                    <g key={`${line.label}-${line.value}`}>
                        <line x1={padding.left} y1={yAt(line.value)} x2={width - padding.right} y2={yAt(line.value)} stroke={line.color ?? "rgba(17,17,17,0.34)"} strokeWidth="1.2" strokeDasharray={line.dashArray ?? "6 6"} />
                        <text className="analysis-chart-reference" x={width - padding.right - 8} y={yAt(line.value) - 6} textAnchor="end">
                            {line.label}
                        </text>
                    </g>
                ))}

                {series.map((item) => {
                    const path = createLinePath(item.values, xAt, yAt);
                    if (!path) return null;

                    return (
                        <path key={item.key} d={path} fill="none" stroke={item.color} strokeWidth={item.strokeWidth ?? 2.6} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={item.dashArray} />
                    );
                })}

                {tooltip ? (
                    <g className="analysis-line-crosshair">
                        <line x1={tooltip.chartX} y1={padding.top} x2={tooltip.chartX} y2={padding.top + innerHeight} />
                        <line x1={padding.left} y1={tooltip.chartY} x2={width - padding.right} y2={tooltip.chartY} />
                        <rect className="analysis-crosshair-price-bg" x={width - padding.right - 76} y={clamp(tooltip.chartY - 11, padding.top, padding.top + innerHeight - 22)} width="74" height="22" rx="8" />
                        <text className="analysis-crosshair-label" x={width - padding.right - 39} y={clamp(tooltip.chartY + 4, padding.top + 15, padding.top + innerHeight - 7)} textAnchor="middle">
                            {priceLabel}
                        </text>
                        <rect className="analysis-crosshair-date-bg" x={dateLabelX} y={height - 30} width="64" height="22" rx="8" />
                        <text className="analysis-crosshair-label" x={dateLabelX + 32} y={height - 15} textAnchor="middle">
                            {dateLabel}
                        </text>
                    </g>
                ) : null}

                {xTicks.map((tickIndex) => (
                    <text key={`x-${tickIndex}`} className="analysis-chart-axis" x={xAt(tickIndex)} y={height - 10} textAnchor={tickIndex === 0 ? "start" : tickIndex === dates.length - 1 ? "end" : "middle"}>
                        {formatShortDateLabel(dates[tickIndex])}
                    </text>
                ))}
            </svg>
            {tooltip ? (
                <div className="analysis-line-tooltip" style={{ transform: `translate(${tooltipX}px, ${tooltipY}px)` }}>
                    <strong>{formatFullDateLabel(dates[tooltip.index])}</strong>
                    {tooltipPoint ? (
                        <>
                            <span>
                                <b>Fiyat</b>
                                <em>{formatTooltipValue(tooltipPoint.close)}</em>
                            </span>
                            <span>
                                <b>Hacim</b>
                                <em>{volumeFormatter(tooltipPoint.volume)}</em>
                            </span>
                            {tooltipIndicatorRows.length > 0 ? <i className="analysis-tooltip-divider" /> : null}
                            {tooltipIndicatorRows.map((row) => (
                                <span key={row.key}>
                                    <b>
                                        <i style={{ backgroundColor: row.color }} />
                                        {row.label}
                                    </b>
                                    <em>{formatTooltipValue(row.value)}</em>
                                </span>
                            ))}
                        </>
                    ) : (
                        tooltipSeriesRows.map((row) => (
                            <span key={row.key}>
                                <b>
                                    <i style={{ backgroundColor: row.color }} />
                                    {row.label}
                                </b>
                                <em>{yFormatter ? yFormatter(row.value) : formatTooltipValue(row.value)}</em>
                            </span>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}
