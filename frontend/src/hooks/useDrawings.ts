import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import {
    clearAllDrawings,
    createDrawing,
    deleteDrawing,
    listDrawings,
    type CreateDrawingRequest,
    type DrawingResponse,
    type InstrumentType,
} from "../api/drawings";

const sortDrawings = (items: DrawingResponse[]) =>
    [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id - right.id);

function emitDrawingError(message: string, error: unknown) {
    if (error instanceof ApiError && error.status === 401) return;

    window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, tone: "error" } }));
}

export function useDrawings(instrumentType: InstrumentType, instrumentCode: string) {
    const [drawings, setDrawings] = useState<DrawingResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [mutating, setMutating] = useState(false);
    const requestIdRef = useRef(0);

    const load = useCallback(async () => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        if (!instrumentCode) {
            setDrawings([]);
            setLoading(false);
            return;
        }

        setDrawings([]);
        setLoading(true);
        try {
            const nextDrawings = await listDrawings(instrumentType, instrumentCode);
            if (requestIdRef.current === requestId) {
                setDrawings(sortDrawings(nextDrawings));
            }
        } catch (error) {
            if (requestIdRef.current === requestId) {
                setDrawings([]);
                emitDrawingError("Çizimler yüklenemedi, tekrar deneyin.", error);
            }
        } finally {
            if (requestIdRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [instrumentCode, instrumentType]);

    useEffect(() => {
        void load();
    }, [load]);

    const add = useCallback(async (create: CreateDrawingRequest) => {
        setMutating(true);
        try {
            const created = await createDrawing(create);
            setDrawings((current) => sortDrawings([...current.filter((item) => item.id !== created.id), created]));
            return created;
        } catch (error) {
            emitDrawingError("Çizim kaydedilemedi, tekrar deneyin.", error);
            throw error;
        } finally {
            setMutating(false);
        }
    }, []);

    const remove = useCallback(async (id: number) => {
        setMutating(true);
        try {
            await deleteDrawing(id);
            setDrawings((current) => current.filter((item) => item.id !== id));
        } catch (error) {
            emitDrawingError("Çizim silinemedi, tekrar deneyin.", error);
            throw error;
        } finally {
            setMutating(false);
        }
    }, []);

    const clearAll = useCallback(async () => {
        if (!instrumentCode) return;

        setMutating(true);
        try {
            await clearAllDrawings(instrumentType, instrumentCode);
            setDrawings([]);
        } catch (error) {
            emitDrawingError("Çizimler silinemedi, tekrar deneyin.", error);
            throw error;
        } finally {
            setMutating(false);
        }
    }, [instrumentCode, instrumentType]);

    return { drawings, loading, mutating, add, remove, clearAll, reload: load };
}
