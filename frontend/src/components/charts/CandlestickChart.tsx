import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
    CandlestickSeries,
    ColorType,
    CrosshairMode,
    LineSeries,
    LineStyle,
    createChart,
    type CandlestickData,
    type LineData,
    type LineWidth,
    type MouseEventParams,
    type Time,
} from "lightweight-charts";
import type { DrawingResponse, DrawingType } from "../../api/drawings";

export type CandlestickPoint = {
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
};

export type CandlestickOverlay = {
    key: string;
    label: string;
    color: string;
    values?: Array<number | null>;
    points?: CandlestickSeriesPoint[];
    lineWidth?: number;
    lineStyle?: LineStyle;
};

export type CandlestickSeriesPoint = {
    date: string;
    value: number | null;
    color?: string;
};

export type CandlestickCloud = {
    key: string;
    upper: CandlestickSeriesPoint[];
    lower: CandlestickSeriesPoint[];
    bullishColor: string;
    bearishColor: string;
};

export type CandlestickTooltipIndicator = {
    key: string;
    label: string;
    color?: string;
    values: Array<number | null>;
    formatter?: (value: number) => string;
};

type PreparedCandlestickPoint = {
    sourceIndex: number;
    time: Time;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
};

type PreparedTooltipIndicator = {
    key: string;
    label: string;
    color?: string;
    value: number;
    formatter?: (value: number) => string;
};

type TooltipState = {
    visible: boolean;
    x: number;
    y: number;
    point: PreparedCandlestickPoint | null;
    indicators: PreparedTooltipIndicator[];
};

export type ChartDrawingPoint = {
    time: string;
    price: number;
};

export type CandlestickDrawingMode = "select" | DrawingType;

type DrawingOverlayShape =
    | {
          key: string;
          kind: "line";
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          color: string;
          lineWidth: number;
          preview: boolean;
      }
    | {
          key: string;
          kind: "rect";
          x: number;
          y: number;
          width: number;
          height: number;
          color: string;
          lineWidth: number;
          preview: boolean;
      };

type CloudOverlayShape = {
    key: string;
    path: string;
    color: string;
};

type CandlestickChartProps = {
    data: CandlestickPoint[];
    overlays?: CandlestickOverlay[];
    clouds?: CandlestickCloud[];
    tooltipIndicators?: CandlestickTooltipIndicator[];
    drawings?: DrawingResponse[];
    drawingMode?: CandlestickDrawingMode;
    drawingDraft?: ChartDrawingPoint | null;
    onDrawingPoint?: (point: ChartDrawingPoint) => void;
    emptyLabel: string;
    valueFormatter?: (value: number) => string;
    volumeFormatter?: (value: number) => string;
    className?: string;
};

const UP_COLOR = "#5bb870";
const DOWN_COLOR = "#e05858";
const GRID_COLOR = "rgba(17, 17, 17, 0.07)";
const AXIS_COLOR = "rgba(17, 17, 17, 0.46)";
const CROSSHAIR_COLOR = "rgba(193, 98, 47, 0.42)";
const EMPTY_TOOLTIP: TooltipState = { visible: false, x: 0, y: 0, point: null, indicators: [] };
const DEFAULT_DRAWING_COLORS: Record<DrawingType, string> = {
    TREND_LINE: "#FF6B35",
    HORIZONTAL_LINE: "#3498db",
    RECTANGLE: "#2ECC71",
};

const isFiniteNumber = (value: number | null | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value);

const formatPlainNumber = (value: number) =>
    value.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatPlainVolume = (value: number) =>
    value.toLocaleString("tr-TR", {
        maximumFractionDigits: 0,
    });

const formatDateLabel = (date: string) => {
    const [year, month, day] = date.split("-");
    if (!year || !month || !day) return date;
    return `${day}.${month}.${year}`;
};

const formatFullDateLabel = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return formatDateLabel(date);

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        weekday: "long",
    })
        .format(parsed)
        .replaceAll(".", "");
};

const toTimeKey = (time: Time) => {
    if (typeof time === "string" || typeof time === "number") return String(time);
    return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
};

const toLineWidth = (value?: number): LineWidth => {
    const rounded = Math.round(value ?? 2);
    return Math.min(4, Math.max(1, rounded)) as LineWidth;
};

const toLineDataFromPoints = (points: CandlestickSeriesPoint[]) =>
    points.reduce<LineData<Time>[]>((values, point) => {
        if (point.date && isFiniteNumber(point.value)) {
            values.push({ time: point.date, value: point.value });
        }

        return values;
    }, []);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const readDrawingPayload = (drawing: DrawingResponse): unknown => {
    const raw = drawing.drawingData as unknown;

    if (typeof raw !== "string") return raw;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const normalizeDrawingTime = (value: unknown): string | null => {
    if (typeof value === "string" && value.length > 0) {
        return value.includes("T") ? value.slice(0, 10) : value;
    }

    return null;
};

const readDrawingPoint = (value: unknown): ChartDrawingPoint | null => {
    if (!isRecord(value)) return null;

    const time = normalizeDrawingTime(value.time);
    const price = value.price;
    if (!time || typeof price !== "number" || !Number.isFinite(price)) {
        return null;
    }

    return { time, price };
};

const readDrawingPoints = (drawing: DrawingResponse): [ChartDrawingPoint, ChartDrawingPoint] | null => {
    const payload = readDrawingPayload(drawing);
    if (!isRecord(payload) || !Array.isArray(payload.points) || payload.points.length < 2) {
        return null;
    }

    const first = readDrawingPoint(payload.points[0]);
    const second = readDrawingPoint(payload.points[1]);
    if (!first || !second) return null;

    return [first, second];
};

const readHorizontalPrice = (drawing: DrawingResponse): number | null => {
    const payload = readDrawingPayload(drawing);
    if (!isRecord(payload) || typeof payload.price !== "number" || !Number.isFinite(payload.price)) {
        return null;
    }

    return payload.price;
};

const getDrawingColor = (drawing: DrawingResponse) =>
    drawing.color ?? DEFAULT_DRAWING_COLORS[drawing.drawingType];

const compareDrawingTimes = (left: ChartDrawingPoint, right: ChartDrawingPoint) =>
    left.time.localeCompare(right.time);

export function CandlestickChart({
    data,
    overlays = [],
    clouds = [],
    tooltipIndicators = [],
    drawings = [],
    drawingMode = "select",
    drawingDraft = null,
    onDrawingPoint,
    emptyLabel,
    valueFormatter = formatPlainNumber,
    volumeFormatter = formatPlainVolume,
    className,
}: CandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState>(EMPTY_TOOLTIP);
    const [drawingOverlayShapes, setDrawingOverlayShapes] = useState<DrawingOverlayShape[]>([]);
    const [cloudOverlayShapes, setCloudOverlayShapes] = useState<CloudOverlayShape[]>([]);
    const [layoutRetry, setLayoutRetry] = useState(0);
    const tooltipRafRef = useRef<number | null>(null);
    const pendingTooltipRef = useRef<TooltipState | null>(null);
    const drawingModeRef = useRef<CandlestickDrawingMode>(drawingMode);
    const drawingDraftRef = useRef<ChartDrawingPoint | null>(drawingDraft);
    const onDrawingPointRef = useRef<typeof onDrawingPoint>(onDrawingPoint);
    const clearDrawingPreviewRef = useRef<() => void>(() => undefined);

    const scheduleTooltip = useCallback((nextTooltip: TooltipState) => {
        pendingTooltipRef.current = nextTooltip;
        if (tooltipRafRef.current !== null) return;

        tooltipRafRef.current = window.requestAnimationFrame(() => {
            tooltipRafRef.current = null;
            setTooltip(pendingTooltipRef.current ?? EMPTY_TOOLTIP);
            pendingTooltipRef.current = null;
        });
    }, []);

    useEffect(() => {
        drawingModeRef.current = drawingMode;
        if (drawingMode === "select") {
            clearDrawingPreviewRef.current();
        }
    }, [drawingMode]);

    useEffect(() => {
        drawingDraftRef.current = drawingDraft;
        if (!drawingDraft) {
            clearDrawingPreviewRef.current();
        }
    }, [drawingDraft]);

    useEffect(() => {
        onDrawingPointRef.current = onDrawingPoint;
    }, [onDrawingPoint]);

    const preparedData = useMemo(
        () =>
            data.reduce<PreparedCandlestickPoint[]>((points, point, sourceIndex) => {
                if (
                    point.date &&
                    isFiniteNumber(point.open) &&
                    isFiniteNumber(point.high) &&
                    isFiniteNumber(point.low) &&
                    isFiniteNumber(point.close)
                ) {
                    points.push({
                        sourceIndex,
                        time: point.date,
                        date: point.date,
                        open: point.open,
                        high: point.high,
                        low: point.low,
                        close: point.close,
                        volume: point.volume,
                    });
                }

                return points;
            }, []),
        [data]
    );

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container || preparedData.length === 0) {
            return;
        }

        const initialRect = container.getBoundingClientRect();
        const initialWidth = Math.floor(initialRect.width || container.clientWidth);
        const initialHeight = Math.floor(initialRect.height || container.clientHeight);

        if (!container.isConnected || initialWidth <= 0 || initialHeight <= 0) {
            const retryFrame = window.requestAnimationFrame(() => {
                setLayoutRetry((value) => value + 1);
            });

            return () => window.cancelAnimationFrame(retryFrame);
        }

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
                panes: {
                    enableResize: false,
                    separatorColor: "rgba(17, 17, 17, 0.08)",
                    separatorHoverColor: "rgba(193, 98, 47, 0.08)",
                },
            },
            grid: {
                vertLines: { color: GRID_COLOR },
                horzLines: { color: GRID_COLOR },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.08, bottom: 0.08 },
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
                priceFormatter: valueFormatter,
                timeFormatter: (time: Time) => formatDateLabel(toTimeKey(time)),
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: UP_COLOR,
            downColor: DOWN_COLOR,
            borderUpColor: UP_COLOR,
            borderDownColor: DOWN_COLOR,
            wickUpColor: UP_COLOR,
            wickDownColor: DOWN_COLOR,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const candleData: CandlestickData<Time>[] = preparedData.map((point) => ({
            time: point.time,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
        }));
        candleSeries.setData(candleData);

        const pointsByIndex = new Map(preparedData.map((point) => [point.sourceIndex, point]));
        overlays.forEach((overlay) => {
            const lineData: LineData<Time>[] = overlay.points
                ? toLineDataFromPoints(overlay.points)
                : (overlay.values ?? []).reduce<LineData<Time>[]>((values, value, sourceIndex) => {
                      const point = pointsByIndex.get(sourceIndex);
                      if (point && isFiniteNumber(value)) {
                          values.push({ time: point.time, value });
                      }
                      return values;
                  }, []);

            if (lineData.length === 0) return;

            const lineSeries = chart.addSeries(LineSeries, {
                color: overlay.color,
                lineWidth: toLineWidth(overlay.lineWidth),
                lineStyle: overlay.lineStyle ?? LineStyle.Solid,
                priceLineVisible: false,
                lastValueVisible: false,
            });
            lineSeries.setData(lineData);
        });

        drawings.forEach((drawing) => {
            const color = getDrawingColor(drawing);
            const lineWidth = toLineWidth(drawing.lineWidth ?? 2);

            if (drawing.drawingType === "HORIZONTAL_LINE") {
                const price = readHorizontalPrice(drawing);
                if (price === null) return;

                candleSeries.createPriceLine({
                    price,
                    color,
                    lineWidth,
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true,
                    title: "",
                });
                return;
            }

            if (drawing.drawingType === "TREND_LINE") {
                const points = readDrawingPoints(drawing);
                if (!points || points[0].time === points[1].time) return;

                const lineData: LineData<Time>[] = [...points]
                    .sort(compareDrawingTimes)
                    .map((point) => ({ time: point.time, value: point.price }));

                const lineSeries = chart.addSeries(LineSeries, {
                    color,
                    lineWidth,
                    lineStyle: LineStyle.Solid,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    crosshairMarkerVisible: false,
                });
                lineSeries.setData(lineData);
            }
        });

        const applyPaneLayout = (currentHeight: number) => {
            const mainPane = chart.panes()[0];
            const mainPaneHeight = Math.max(220, currentHeight);

            mainPane?.setStretchFactor(1);
            mainPane?.setHeight(mainPaneHeight);
        };

        applyPaneLayout(height);
        chart.timeScale().fitContent();

        const toChartCoordinate = (point: ChartDrawingPoint) => {
            const x = chart.timeScale().timeToCoordinate(point.time as Time);
            const y = candleSeries.priceToCoordinate(point.price);

            if (x === null || y === null) return null;
            return { x, y };
        };

        const buildRectangleShape = (
            key: string,
            first: ChartDrawingPoint,
            second: ChartDrawingPoint,
            color: string,
            lineWidth: number,
            preview: boolean
        ): DrawingOverlayShape | null => {
            const start = toChartCoordinate(first);
            const end = toChartCoordinate(second);
            if (!start || !end) return null;

            return {
                key,
                kind: "rect",
                x: Math.min(start.x, end.x),
                y: Math.min(start.y, end.y),
                width: Math.abs(end.x - start.x),
                height: Math.abs(end.y - start.y),
                color,
                lineWidth,
                preview,
            };
        };

        const buildLineShape = (
            key: string,
            first: ChartDrawingPoint,
            second: ChartDrawingPoint,
            color: string,
            lineWidth: number,
            preview: boolean
        ): DrawingOverlayShape | null => {
            const start = toChartCoordinate(first);
            const end = toChartCoordinate(second);
            if (!start || !end) return null;

            return {
                key,
                kind: "line",
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y,
                color,
                lineWidth,
                preview,
            };
        };

        const buildCloudOverlayShapes = () => {
            const shapes: CloudOverlayShape[] = [];

            clouds.forEach((cloud) => {
                const lowerByDate = new Map(
                    cloud.lower
                        .filter((point): point is CandlestickSeriesPoint & { value: number } => isFiniteNumber(point.value))
                        .map((point) => [point.date, point.value])
                );
                let segment: Array<{ x: number; upperY: number; lowerY: number }> = [];
                let segmentIsBullish: boolean | null = null;

                const flushSegment = () => {
                    if (segment.length < 2 || segmentIsBullish === null) {
                        segment = [];
                        segmentIsBullish = null;
                        return;
                    }

                    const upperPath = segment.map((point) => `${point.x.toFixed(2)},${point.upperY.toFixed(2)}`);
                    const lowerPath = [...segment]
                        .reverse()
                        .map((point) => `${point.x.toFixed(2)},${point.lowerY.toFixed(2)}`);
                    shapes.push({
                        key: `${cloud.key}-${shapes.length}`,
                        path: `M${upperPath.join(" L")} L${lowerPath.join(" L")} Z`,
                        color: segmentIsBullish ? cloud.bullishColor : cloud.bearishColor,
                    });
                    segment = [];
                    segmentIsBullish = null;
                };

                cloud.upper.forEach((upperPoint) => {
                    const lowerValue = lowerByDate.get(upperPoint.date);
                    if (!isFiniteNumber(upperPoint.value) || !isFiniteNumber(lowerValue)) {
                        flushSegment();
                        return;
                    }

                    const x = chart.timeScale().timeToCoordinate(upperPoint.date as Time);
                    const upperY = candleSeries.priceToCoordinate(upperPoint.value);
                    const lowerY = candleSeries.priceToCoordinate(lowerValue);
                    if (x === null || upperY === null || lowerY === null) {
                        flushSegment();
                        return;
                    }

                    const isBullish = upperPoint.value >= lowerValue;
                    if (segmentIsBullish !== null && segmentIsBullish !== isBullish) {
                        flushSegment();
                    }

                    segmentIsBullish = isBullish;
                    segment.push({ x, upperY, lowerY });
                });

                flushSegment();
            });

            return shapes;
        };

        const buildDrawingOverlayShapes = (previewPoint: ChartDrawingPoint | null) => {
            const shapes: DrawingOverlayShape[] = [];

            drawings.forEach((drawing) => {
                const points = readDrawingPoints(drawing);
                if (!points) return;

                const color = getDrawingColor(drawing);
                const lineWidth = Math.max(1, Math.round(drawing.lineWidth ?? 2));

                if (drawing.drawingType === "RECTANGLE") {
                    const shape = buildRectangleShape(
                        `drawing-${drawing.id}`,
                        points[0],
                        points[1],
                        color,
                        lineWidth,
                        false
                    );
                    if (shape) shapes.push(shape);
                    return;
                }

                if (drawing.drawingType === "TREND_LINE" && points[0].time === points[1].time) {
                    const shape = buildLineShape(`drawing-${drawing.id}`, points[0], points[1], color, lineWidth, false);
                    if (shape) shapes.push(shape);
                }
            });

            const draft = drawingDraftRef.current;
            const mode = drawingModeRef.current;
            if (draft && previewPoint && (mode === "TREND_LINE" || mode === "RECTANGLE")) {
                const shape =
                    mode === "TREND_LINE"
                        ? buildLineShape("drawing-preview", draft, previewPoint, DEFAULT_DRAWING_COLORS.TREND_LINE, 2, true)
                        : buildRectangleShape(
                              "drawing-preview",
                              draft,
                              previewPoint,
                              DEFAULT_DRAWING_COLORS.RECTANGLE,
                              2,
                              true
                          );

                if (shape) shapes.push(shape);
            }

            return shapes;
        };

        let previewPoint: ChartDrawingPoint | null = null;
        let drawingOverlayRaf: number | null = null;
        let cloudOverlayRaf: number | null = null;
        const scheduleDrawingOverlay = () => {
            if (drawingOverlayRaf !== null) return;

            drawingOverlayRaf = window.requestAnimationFrame(() => {
                drawingOverlayRaf = null;
                setDrawingOverlayShapes(buildDrawingOverlayShapes(previewPoint));
            });
        };
        const scheduleCloudOverlay = () => {
            if (cloudOverlayRaf !== null) return;

            cloudOverlayRaf = window.requestAnimationFrame(() => {
                cloudOverlayRaf = null;
                setCloudOverlayShapes(buildCloudOverlayShapes());
            });
        };

        clearDrawingPreviewRef.current = () => {
            previewPoint = null;
            scheduleDrawingOverlay();
        };
        scheduleCloudOverlay();
        scheduleDrawingOverlay();

        const resolveDrawingClickPoint = (param: MouseEventParams<Time>): ChartDrawingPoint | null => {
            if (!param.point || param.time === undefined) return null;

            const price = candleSeries.coordinateToPrice(param.point.y);
            if (typeof price !== "number" || !Number.isFinite(price)) return null;

            return {
                time: toTimeKey(param.time),
                price,
            };
        };

        const pointByTime = new Map(preparedData.map((point) => [toTimeKey(point.time), point]));
        const handleCrosshairMove = (param: MouseEventParams<Time>) => {
            const nextDrawingPoint = resolveDrawingClickPoint(param);
            const mode = drawingModeRef.current;
            previewPoint =
                nextDrawingPoint && drawingDraftRef.current && (mode === "TREND_LINE" || mode === "RECTANGLE")
                    ? nextDrawingPoint
                    : null;
            scheduleDrawingOverlay();

            if (!param.point || param.time === undefined) {
                scheduleTooltip(EMPTY_TOOLTIP);
                return;
            }

            const point = pointByTime.get(toTimeKey(param.time));
            if (!point) {
                scheduleTooltip(EMPTY_TOOLTIP);
                return;
            }

            const currentSize = resolveSize();
            if (
                param.point.x < 0 ||
                param.point.y < 0 ||
                param.point.x > currentSize.width ||
                param.point.y > currentSize.height
            ) {
                scheduleTooltip(EMPTY_TOOLTIP);
                return;
            }

            const indicators = tooltipIndicators.reduce<PreparedTooltipIndicator[]>((items, indicator) => {
                const value = indicator.values[point.sourceIndex];
                if (isFiniteNumber(value)) {
                    items.push({
                        key: indicator.key,
                        label: indicator.label,
                        color: indicator.color,
                        value,
                        formatter: indicator.formatter,
                    });
                }
                return items;
            }, []);

            const tooltipWidth = 238;
            const tooltipHeight = 178 + indicators.length * 20;
            const offset = 16;
            const placeLeft = param.point.x > currentSize.width / 2;
            const placeTop = param.point.y > currentSize.height / 2;
            const preferredX = placeLeft ? param.point.x - tooltipWidth - offset : param.point.x + offset;
            const preferredY = placeTop ? param.point.y - tooltipHeight - offset : param.point.y + offset;
            const x = Math.min(Math.max(preferredX, 8), currentSize.width - tooltipWidth - 8);
            const y = Math.min(Math.max(preferredY, 8), currentSize.height - tooltipHeight - 8);

            scheduleTooltip({ visible: true, x, y, point, indicators });
        };

        chart.subscribeCrosshairMove(handleCrosshairMove);

        const handleClick = (param: MouseEventParams<Time>) => {
            if (drawingModeRef.current === "select") return;

            const point = resolveDrawingClickPoint(param);
            if (!point) return;

            onDrawingPointRef.current?.(point);
        };

        chart.subscribeClick(handleClick);

        const handleVisibleRangeChange = () => {
            scheduleCloudOverlay();
            scheduleDrawingOverlay();
        };

        chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleRangeChange);

        const handleResize = (resetVisibleRange = true) => {
            const nextSize = resolveSize();
            chart.resize(nextSize.width, nextSize.height, true);
            applyPaneLayout(nextSize.height);
            if (resetVisibleRange) {
                chart.timeScale().fitContent();
            }
            scheduleCloudOverlay();
            scheduleDrawingOverlay();
        };
        const initialPaintRafs: number[] = [];
        const scheduleInitialPaint = () => {
            const firstFrame = window.requestAnimationFrame(() => {
                handleResize();
                const secondFrame = window.requestAnimationFrame(() => {
                    handleResize(false);
                });
                initialPaintRafs.push(secondFrame);
            });
            initialPaintRafs.push(firstFrame);
        };

        scheduleInitialPaint();

        let cleanupResize: () => void = () => undefined;
        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(() => handleResize(false));
            observer.observe(container);
            cleanupResize = () => observer.disconnect();
        } else {
            const onWindowResize = () => handleResize(false);
            window.addEventListener("resize", onWindowResize);
            cleanupResize = () => window.removeEventListener("resize", onWindowResize);
        }

        return () => {
            cleanupResize();
            chart.unsubscribeCrosshairMove(handleCrosshairMove);
            chart.unsubscribeClick(handleClick);
            chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
            chart.remove();
            clearDrawingPreviewRef.current = () => undefined;
            setCloudOverlayShapes([]);
            setDrawingOverlayShapes([]);
            initialPaintRafs.forEach((frame) => window.cancelAnimationFrame(frame));
            if (cloudOverlayRaf !== null) {
                window.cancelAnimationFrame(cloudOverlayRaf);
                cloudOverlayRaf = null;
            }
            if (drawingOverlayRaf !== null) {
                window.cancelAnimationFrame(drawingOverlayRaf);
                drawingOverlayRaf = null;
            }
            if (tooltipRafRef.current !== null) {
                window.cancelAnimationFrame(tooltipRafRef.current);
                tooltipRafRef.current = null;
            }
        };
    }, [
        clouds,
        drawings,
        layoutRetry,
        overlays,
        preparedData,
        scheduleTooltip,
        tooltipIndicators,
        valueFormatter,
    ]);

    if (preparedData.length === 0) {
        return (
            <div className="analysis-chart-empty">
                <strong>Gösterilecek mum verisi yok</strong>
                <span>{emptyLabel}</span>
            </div>
        );
    }

    const frameClassName = ["analysis-chart-frame", "analysis-candlestick-frame", className]
        .filter(Boolean)
        .join(" ");
    const chartClassName = [
        "analysis-candlestick-chart",
        drawingMode === "HORIZONTAL_LINE" ? "drawing-horizontal" : "",
        drawingMode === "TREND_LINE" || drawingMode === "RECTANGLE" ? "drawing-crosshair" : "",
    ]
        .filter(Boolean)
        .join(" ");
    const chartStyle = {
        "--analysis-candlestick-height": "340px",
    } as CSSProperties;

    return (
        <div className={frameClassName}>
            <div className={chartClassName} style={chartStyle} onPointerLeave={() => scheduleTooltip(EMPTY_TOOLTIP)}>
                <div ref={containerRef} className="analysis-candlestick-container" />
                {cloudOverlayShapes.length > 0 ? (
                    <svg className="analysis-indicator-cloud-overlay" aria-hidden="true" focusable="false">
                        {cloudOverlayShapes.map((shape) => (
                            <path key={shape.key} d={shape.path} fill={shape.color} />
                        ))}
                    </svg>
                ) : null}
                {drawingOverlayShapes.length > 0 ? (
                    <svg className="analysis-drawing-overlay" aria-hidden="true" focusable="false">
                        {drawingOverlayShapes.map((shape) =>
                            shape.kind === "rect" ? (
                                <rect
                                    key={shape.key}
                                    x={shape.x}
                                    y={shape.y}
                                    width={Math.max(shape.width, 1)}
                                    height={Math.max(shape.height, 1)}
                                    rx={4}
                                    ry={4}
                                    fill={shape.preview ? "rgba(46, 204, 113, 0.12)" : "rgba(46, 204, 113, 0.16)"}
                                    stroke={shape.color}
                                    strokeWidth={shape.lineWidth}
                                    strokeDasharray={shape.preview ? "6 5" : undefined}
                                    vectorEffect="non-scaling-stroke"
                                />
                            ) : (
                                <line
                                    key={shape.key}
                                    x1={shape.x1}
                                    y1={shape.y1}
                                    x2={shape.x2}
                                    y2={shape.y2}
                                    stroke={shape.color}
                                    strokeWidth={shape.lineWidth}
                                    strokeDasharray={shape.preview ? "6 5" : undefined}
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )
                        )}
                    </svg>
                ) : null}
                {tooltip.visible && tooltip.point ? (
                    <div
                        className="analysis-candlestick-tooltip"
                        style={{ transform: `translate(${tooltip.x}px, ${tooltip.y}px)` }}
                    >
                        <strong>{formatFullDateLabel(tooltip.point.date)}</strong>
                        <span>
                            <b>Açılış (O)</b>
                            <em>{valueFormatter(tooltip.point.open)}</em>
                        </span>
                        <span>
                            <b>Yüksek (H)</b>
                            <em>{valueFormatter(tooltip.point.high)}</em>
                        </span>
                        <span>
                            <b>Düşük (L)</b>
                            <em>{valueFormatter(tooltip.point.low)}</em>
                        </span>
                        <span>
                            <b>Kapanış (C)</b>
                            <em className={tooltip.point.close >= tooltip.point.open ? "up" : "down"}>
                                {valueFormatter(tooltip.point.close)}
                            </em>
                        </span>
                        <span>
                            <b>Hacim</b>
                            <em>{volumeFormatter(tooltip.point.volume ?? 0)}</em>
                        </span>
                        {tooltip.indicators.length > 0 ? <i className="analysis-tooltip-divider" /> : null}
                        {tooltip.indicators.map((indicator) => (
                            <span key={indicator.key}>
                                <b>
                                    {indicator.color ? <i style={{ backgroundColor: indicator.color }} /> : null}
                                    {indicator.label}
                                </b>
                                <em>{(indicator.formatter ?? valueFormatter)(indicator.value)}</em>
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
