import { apiFetch } from "./client";

type ApiResponse<T> = {
    success: boolean;
    data: T;
};

export interface UserResponse {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "NORMAL_USER" | "ADMIN";
    isActive: boolean;
    lastLoginAt: string;
    createdAt: string;
}

export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
}

async function readUserResponse(response: Response, fallbackMessage: string): Promise<UserResponse> {
    const raw = (await response.json()) as ApiResponse<UserResponse>;

    if (raw?.success !== true || !raw.data) {
        throw new Error(`${fallbackMessage} Geçersiz API cevabı alındı.`);
    }

    return raw.data;
}

export async function fetchCurrentUser(): Promise<UserResponse> {
    const response = await apiFetch("/api/v1/users/me", {
        errorMessage: "Profil bilgileri yüklenemedi.",
    });

    return readUserResponse(response, "Profil bilgileri yüklenemedi.");
}

export async function updateCurrentUser(data: UpdateUserRequest): Promise<UserResponse> {
    const response = await apiFetch("/api/v1/users/me", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        errorMessage: "Profil güncellenemedi.",
    });

    return readUserResponse(response, "Profil güncellenemedi.");
}
