import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUiPreferences } from "../../../app/providers/UiPreferencesContext";
import {
    ColorType,
    CrosshairMode,
    LineSeries,
    LineStyle,
    createChart,
    type LineData,
    type LineWidth,
    type MouseEventParams,
    type Time,
} from "lightweight-charts";

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

type TooltipRow = {
    key: string;
    label: string;
    color: string;
    value: number;
};

type LineTooltipState = {
    index: number;
    x: number;
    y: number;
    frameWidth: number;
    frameHeight: number;
    rows: TooltipRow[];
};

const CROSSHAIR_COLOR = "rgba(193, 98, 47, 0.42)";

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

function toLineWidth(value?: number): LineWidth {
    const rounded = Math.round(value ?? 2);
    return Math.min(4, Math.max(1, rounded)) as LineWidth;
}

function toLineStyle(dashArray?: string): LineStyle {
    return dashArray ? LineStyle.Dashed : LineStyle.Solid;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function toLineData(dates: string[], values: Array<number | null>): LineData<Time>[] {
    return values.reduce<LineData<Time>[]>((items, value, index) => {
        const time = dates[index];
        const normalized = toSafeNumber(value);
        if (time && normalized !== null) {
            items.push({ time, value: normalized });
        }
        return items;
    }, []);
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
    const { t } = useTranslation();
    const { resolvedTheme } = useUiPreferences();
    const isDark = resolvedTheme === "dark";
    const GRID_COLOR = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 17, 17, 0.07)";
    const AXIS_COLOR = isDark ? "rgba(255, 255, 255, 0.52)" : "rgba(17, 17, 17, 0.52)";

    const frameRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<HTMLDivElement | null>(null);
    const [tooltip, setTooltip] = useState<LineTooltipState | null>(null);
    const tooltipRafRef = useRef<number | null>(null);
    const pendingTooltipRef = useRef<LineTooltipState | null>(null);
    const formatTooltipValue = useMemo(
        () => valueFormatter ?? ((value: number | null | undefined) => formatDecimal(value, 2)),
        [valueFormatter],
    );

    const preparedSeries = useMemo(
        () => series.map((item) => ({ ...item, data: toLineData(dates, item.values) })),
        [dates, series],
    );

    const domainValues = useMemo(
        () => [
            ...preparedSeries.flatMap((item) => item.data.map((point) => point.value)),
            ...referenceLines.map((line) => line.value),
        ],
        [preparedSeries, referenceLines],
    );

    useEffect(() => {
        const frame = frameRef.current;
        const container = chartRef.current;
        if (!frame || !container || domainValues.length === 0 || dates.length === 0) return undefined;

        const resolveSize = () => ({
            width: Math.max(Math.floor(container.getBoundingClientRect().width || container.clientWidth), 320),
            height: Math.max(Math.floor(container.getBoundingClientRect().height || container.clientHeight), 260),
        });

        const { width, height } = resolveSize();
        const chart = createChart(container, {
            width,
            height,
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: AXIS_COLOR,
                fontFamily: "Sora, sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: GRID_COLOR },
                horzLines: { color: GRID_COLOR },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
                timeVisible: false,
                secondsVisible: false,
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: CROSSHAIR_COLOR,
                    width: 1,
                    style: LineStyle.Dashed,
                    labelVisible: true,
                    labelBackgroundColor: "rgba(17, 17, 17, 0.88)",
                },
                horzLine: {
                    color: CROSSHAIR_COLOR,
                    width: 1,
                    style: LineStyle.Dashed,
                    labelVisible: true,
                    labelBackgroundColor: "rgba(17, 17, 17, 0.88)",
                },
            },
            localization: {
                priceFormatter: yFormatter ?? ((value: number) => formatTooltipValue(value)),
                timeFormatter: (time: Time) => String(time),
            },
        });

        const createAnchorSeries = () =>
            chart.addSeries(LineSeries, {
                color: "rgba(0,0,0,0)",
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            });

        const lineSeries = preparedSeries
            .filter((item) => item.data.length > 0)
            .map((item) => {
                const api = chart.addSeries(LineSeries, {
                    color: item.color,
                    lineWidth: toLineWidth(item.strokeWidth),
                    lineStyle: toLineStyle(item.dashArray),
                    priceLineVisible: false,
                    lastValueVisible: false,
                    crosshairMarkerVisible: true,
                    crosshairMarkerRadius: 4,
                });
                api.setData(item.data);
                return api;
            });

        const priceLineTarget = lineSeries[0] ?? createAnchorSeries();
        referenceLines.forEach((line) => {
            priceLineTarget.createPriceLine({
                price: line.value,
                color: line.color ?? "rgba(17, 17, 17, 0.32)",
                lineWidth: 1,
                lineStyle: toLineStyle(line.dashArray),
                axisLabelVisible: true,
                title: line.label,
            });
        });

        if (fixedDomain) {
            const [minimum, maximum] = fixedDomain;
            const firstDate = dates[0];
            const lastDate = dates.at(-1) ?? firstDate;
            if (firstDate && Number.isFinite(minimum) && Number.isFinite(maximum)) {
                const domainSeries = createAnchorSeries();
                domainSeries.setData([
                    { time: firstDate, value: minimum },
                    { time: lastDate, value: maximum },
                ]);
            }
        }

        const indexByTime = new Map(dates.map((date, index) => [date, index]));
        const scheduleTooltip = (nextTooltip: LineTooltipState | null) => {
            pendingTooltipRef.current = nextTooltip;
            if (tooltipRafRef.current !== null) return;

            tooltipRafRef.current = window.requestAnimationFrame(() => {
                tooltipRafRef.current = null;
                setTooltip(pendingTooltipRef.current);
                pendingTooltipRef.current = null;
            });
        };

        const handleCrosshairMove = (param: MouseEventParams<Time>) => {
            if (!param.point || param.time === undefined) {
                scheduleTooltip(null);
                return;
            }

            const currentSize = resolveSize();
            if (
                param.point.x < 0 ||
                param.point.y < 0 ||
                param.point.x > currentSize.width ||
                param.point.y > currentSize.height
            ) {
                scheduleTooltip(null);
                return;
            }

            const index = indexByTime.get(String(param.time));
            if (index === undefined) {
                scheduleTooltip(null);
                return;
            }

            const rows = series.reduce<TooltipRow[]>((items, item) => {
                const value = item.values[index];
                const normalized = toSafeNumber(value);
                if (normalized !== null) {
                    items.push({ key: item.key, label: item.label, color: item.color, value: normalized });
                }
                return items;
            }, []);

            scheduleTooltip({
                index,
                x: param.point.x,
                y: param.point.y,
                frameWidth: currentSize.width,
                frameHeight: currentSize.height,
                rows,
            });
        };

        chart.subscribeCrosshairMove(handleCrosshairMove);
        chart.timeScale().fitContent();

        const handleResize = () => {
            const nextSize = resolveSize();
            chart.resize(nextSize.width, nextSize.height, true);
        };

        let cleanupResize: () => void = () => undefined;
        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(handleResize);
            observer.observe(container);
            cleanupResize = () => observer.disconnect();
        } else {
            window.addEventListener("resize", handleResize);
            cleanupResize = () => window.removeEventListener("resize", handleResize);
        }

        return () => {
            cleanupResize();
            chart.unsubscribeCrosshairMove(handleCrosshairMove);
            chart.remove();
            if (tooltipRafRef.current !== null) {
                window.cancelAnimationFrame(tooltipRafRef.current);
                tooltipRafRef.current = null;
            }
            setTooltip(null);
        };
    }, [dates, domainValues.length, fixedDomain, formatTooltipValue, preparedSeries, referenceLines, series, yFormatter, resolvedTheme]);

    if (domainValues.length === 0) {
        return (
            <div className="analysis-chart-empty">
                <strong>{t("analysis.chart.notReady")}</strong>
                <span>{emptyLabel}</span>
            </div>
        );
    }

    const tooltipPoint = tooltip ? tooltipData[tooltip.index] : undefined;
    const tooltipRows = tooltip?.rows ?? [];
    const tooltipIndicatorRows = tooltipPoint ? tooltipRows.filter((row) => row.key !== "close") : [];
    const tooltipWidth = 232;
    const tooltipHeight = tooltipPoint ? 150 + tooltipIndicatorRows.length * 19 : 70 + (tooltip?.rows.length ?? 0) * 19;
    const tooltipX = tooltip
        ? clamp(
              tooltip.x > tooltip.frameWidth / 2 ? tooltip.x - tooltipWidth - 16 : tooltip.x + 16,
              8,
              Math.max(8, tooltip.frameWidth - tooltipWidth - 8),
          )
        : 0;
    const tooltipY = tooltip
        ? clamp(
              tooltip.y > tooltip.frameHeight / 2 ? tooltip.y - tooltipHeight - 16 : tooltip.y + 16,
              8,
              Math.max(8, tooltip.frameHeight - tooltipHeight - 8),
          )
        : 0;

    return (
        <div ref={frameRef} className="analysis-chart-frame analysis-line-chart-frame">
            <div ref={chartRef} className="analysis-line-chart-container" />
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
                        tooltipRows.map((row) => (
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
