import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import HighlightAltIcon from "@mui/icons-material/HighlightAlt";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import MouseIcon from "@mui/icons-material/Mouse";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { ButtonGroup, IconButton, Tooltip } from "@mui/material";
import type { ReactNode } from "react";
import type { CandlestickDrawingMode } from "../../../components/charts/CandlestickChart";

type DrawingToolbarProps = {
    activeTool: CandlestickDrawingMode;
    toolDisabled: boolean;
    busy: boolean;
    canClear: boolean;
    onSelect: (tool: CandlestickDrawingMode) => void;
    onClear: () => void;
};

const drawingTools: Array<{
    key: CandlestickDrawingMode;
    label: string;
    icon: ReactNode;
}> = [
    { key: "select", label: "Seç", icon: <MouseIcon fontSize="small" /> },
    { key: "TREND_LINE", label: "Trend çizgisi", icon: <ShowChartIcon fontSize="small" /> },
    { key: "HORIZONTAL_LINE", label: "Yatay çizgi", icon: <HorizontalRuleIcon fontSize="small" /> },
    { key: "RECTANGLE", label: "Dikdörtgen", icon: <HighlightAltIcon fontSize="small" /> },
];

export function DrawingToolbar({ activeTool, toolDisabled, busy, canClear, onSelect, onClear }: DrawingToolbarProps) {
    return (
        <ButtonGroup className="analysis-drawing-toolbar" variant="outlined" size="small" aria-label="Çizim araçları">
            {drawingTools.map((tool) => {
                const disabled = busy || (toolDisabled && tool.key !== "select");
                const active = activeTool === tool.key;
                return (
                    <Tooltip key={tool.key} title={tool.label}>
                        <span>
                            <IconButton
                                className={`analysis-drawing-tool ${active ? "active" : ""}`.trim()}
                                type="button"
                                aria-label={tool.label}
                                aria-pressed={active}
                                disabled={disabled}
                                color={active ? "secondary" : "default"}
                                onClick={() => onSelect(tool.key)}
                            >
                                {tool.icon}
                            </IconButton>
                        </span>
                    </Tooltip>
                );
            })}
            <Tooltip title="Tümünü temizle">
                <span>
                    <IconButton
                        className="analysis-drawing-tool danger"
                        type="button"
                        aria-label="Tüm çizimleri temizle"
                        disabled={busy || !canClear}
                        color="error"
                        onClick={onClear}
                    >
                        {busy ? <span className="analysis-drawing-spinner" aria-hidden="true" /> : <DeleteOutlinedIcon fontSize="small" />}
                    </IconButton>
                </span>
            </Tooltip>
        </ButtonGroup>
    );
}
