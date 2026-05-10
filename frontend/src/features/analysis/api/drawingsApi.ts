import { apiFetch } from "../../../services/api/client";
import type { ApiResponse } from "../../market/api/marketApi";

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

const DRAWING_ERROR = "Çizim işlemi tamamlanamadı.";

async function readDrawing(response: Response, fallbackMessage: string): Promise<DrawingResponse> {
    const raw = (await response.json()) as ApiResponse<DrawingResponse>;
    if (raw?.success !== true || !raw.data) {
        throw new Error(`${fallbackMessage} Geçersiz API cevabı alındı.`);
    }

    return raw.data;
}

async function readDrawingList(response: Response, fallbackMessage: string): Promise<DrawingResponse[]> {
    const raw = (await response.json()) as ApiResponse<DrawingResponse[]>;
    if (raw?.success !== true || !Array.isArray(raw.data)) {
        throw new Error(`${fallbackMessage} Geçersiz API cevabı alındı.`);
    }

    return raw.data;
}

export async function listDrawings(
    instrumentType: InstrumentType,
    instrumentCode: string
): Promise<DrawingResponse[]> {
    const params = new URLSearchParams({
        instrumentType,
        instrumentCode,
    });
    const response = await apiFetch(`/api/v1/drawings?${params.toString()}`, {
        errorMessage: "Çizimler yüklenemedi.",
    });

    return readDrawingList(response, "Çizimler yüklenemedi.");
}

export async function createDrawing(data: CreateDrawingRequest): Promise<DrawingResponse> {
    const response = await apiFetch("/api/v1/drawings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        errorMessage: "Çizim kaydedilemedi, tekrar deneyin.",
    });

    return readDrawing(response, "Çizim kaydedilemedi, tekrar deneyin.");
}

export async function updateDrawing(id: number, data: UpdateDrawingRequest): Promise<DrawingResponse> {
    const response = await apiFetch(`/api/v1/drawings/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        errorMessage: DRAWING_ERROR,
    });

    return readDrawing(response, DRAWING_ERROR);
}

export async function deleteDrawing(id: number): Promise<void> {
    await apiFetch(`/api/v1/drawings/${id}`, {
        method: "DELETE",
        errorMessage: DRAWING_ERROR,
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
        errorMessage: "Çizimler silinemedi, tekrar deneyin.",
    });
}
