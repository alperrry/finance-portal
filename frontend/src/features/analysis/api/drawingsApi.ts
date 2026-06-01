import { apiFetch } from "../../../services/api/client";
import type { ApiResponse } from "../../market/api/marketApi";
import i18n from "../../../i18n";

export type DrawingType = "TREND_LINE" | "HORIZONTAL_LINE" | "RECTANGLE";
export type InstrumentType = "STOCK" | "CURRENCY" | "FUND" | "BOND" | "VIOP";

export interface DrawingResponse {
    id: number;
    instrumentType: InstrumentType;
    instrumentCode: string;
    drawingType: DrawingType;
    drawingData: string;
    color: string | null;
    lineWidth: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDrawingRequest {
    instrumentType: InstrumentType;
    instrumentCode: string;
    drawingType: DrawingType;
    drawingData: string;
    color?: string;
    lineWidth?: number;
}

export interface UpdateDrawingRequest {
    drawingData?: string;
    color?: string;
    lineWidth?: number;
}

const getDrawingError = () => i18n.t("analysis.drawings.errors.operation");

async function readDrawing(response: Response, fallbackMessage: string): Promise<DrawingResponse> {
    const raw = (await response.json()) as ApiResponse<DrawingResponse>;
    if (raw?.success !== true || !raw.data) {
        throw new Error(`${fallbackMessage} ${i18n.t("analysis.drawings.errors.invalidApi")}`);
    }

    return raw.data;
}

async function readDrawingList(response: Response, fallbackMessage: string): Promise<DrawingResponse[]> {
    const raw = (await response.json()) as ApiResponse<DrawingResponse[]>;
    if (raw?.success !== true || !Array.isArray(raw.data)) {
        throw new Error(`${fallbackMessage} ${i18n.t("analysis.drawings.errors.invalidApi")}`);
    }

    return raw.data;
}

export async function listDrawings(
    instrumentType: InstrumentType,
    instrumentCode: string
): Promise<DrawingResponse[]> {
    const loadMsg = () => i18n.t("analysis.drawings.errors.load");
    const params = new URLSearchParams({
        instrumentType,
        instrumentCode,
    });
    const response = await apiFetch(`/api/v1/drawings?${params.toString()}`, {
        errorMessage: loadMsg(),
    });

    return readDrawingList(response, loadMsg());
}

export async function createDrawing(data: CreateDrawingRequest): Promise<DrawingResponse> {
    const saveMsg = () => i18n.t("analysis.drawings.errors.save");
    const response = await apiFetch("/api/v1/drawings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        errorMessage: saveMsg(),
    });

    return readDrawing(response, saveMsg());
}

export async function updateDrawing(id: number, data: UpdateDrawingRequest): Promise<DrawingResponse> {
    const response = await apiFetch(`/api/v1/drawings/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        errorMessage: getDrawingError(),
    });

    return readDrawing(response, getDrawingError());
}

export async function deleteDrawing(id: number): Promise<void> {
    await apiFetch(`/api/v1/drawings/${id}`, {
        method: "DELETE",
        errorMessage: getDrawingError(),
    });
}

export async function clearAllDrawings(
    instrumentType: InstrumentType,
    instrumentCode: string
): Promise<void> {
    const params = new URLSearchParams({
        instrumentType,
        instrumentCode,
    });
    await apiFetch(`/api/v1/drawings?${params.toString()}`, {
        method: "DELETE",
        errorMessage: i18n.t("analysis.drawings.errors.delete"),
    });
}
