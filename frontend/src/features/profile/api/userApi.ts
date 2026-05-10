import { apiFetch } from "../../../services/api/client";

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
    balance: number;
    createdAt: string;
}

export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface SecurityStatusResponse {
    otpEnabled: boolean;
    otpCredentials: Array<{
        id: string;
        label: string;
        createdAt: number | null;
    }>;
}

export interface OtpSetupResponse {
    qrCodeDataUrl: string;
    secret: string;
}

async function readUserResponse(response: Response, fallbackMessage: string): Promise<UserResponse> {
    const raw = (await response.json()) as ApiResponse<UserResponse>;

    if (raw?.success !== true || !raw.data) {
        throw new Error(`${fallbackMessage} Geçersiz API cevabı alındı.`);
    }

    return raw.data;
}

async function readSecurityStatusResponse(response: Response, fallbackMessage: string): Promise<SecurityStatusResponse> {
    const raw = (await response.json()) as ApiResponse<SecurityStatusResponse>;

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

export async function fetchSecurityStatus(): Promise<SecurityStatusResponse> {
    const response = await apiFetch("/api/v1/users/me/security", {
        errorMessage: "Güvenlik bilgileri yüklenemedi.",
    });

    return readSecurityStatusResponse(response, "Güvenlik bilgileri yüklenemedi.");
}

export async function changeCurrentUserPassword(newPassword: string): Promise<void> {
    await apiFetch("/api/v1/users/me/password", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
        errorMessage: "Şifre güncellenemedi.",
    });
}

export async function setupOtp(): Promise<OtpSetupResponse> {
    const response = await apiFetch("/api/v1/users/me/security/otp/setup", {
        method: "POST",
        errorMessage: "TOTP kurulumu baslatılamadı.",
    });

    const raw = (await response.json()) as ApiResponse<OtpSetupResponse>;
    if (raw?.success !== true || !raw.data) {
        throw new Error("TOTP kurulumu baslatılamadı. Geçersiz API cevabı alındı.");
    }
    return raw.data;
}

export async function verifyOtp(code: string): Promise<SecurityStatusResponse> {
    const response = await apiFetch("/api/v1/users/me/security/otp/verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
        errorMessage: "Kod dogrulanamadı.",
    });

    return readSecurityStatusResponse(response, "Kod dogrulanamadı.");
}

export async function deleteOtpCredential(credentialId: string): Promise<SecurityStatusResponse> {
    const response = await apiFetch(`/api/v1/users/me/security/otp/${encodeURIComponent(credentialId)}`, {
        method: "DELETE",
        errorMessage: "İki aşamalı doğrulama kaldırılamadı.",
    });

    return readSecurityStatusResponse(response, "İki aşamalı doğrulama kaldırılamadı.");
}
