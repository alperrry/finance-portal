import { ApiError } from "../../../services/api/client";

export function resolveAdminError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}
