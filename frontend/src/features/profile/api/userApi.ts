import { apiFetch } from "../../../services/api/client";
import i18n from "../../../i18n";

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
        throw new Error(`${fallbackMessage} ${i18n.t("profile.errors.invalidApiResponse")}`);
    }

    return raw.data;
}

async function readSecurityStatusResponse(response: Response, fallbackMessage: string): Promise<SecurityStatusResponse> {
    const raw = (await response.json()) as ApiResponse<SecurityStatusResponse>;

    if (raw?.success !== true || !raw.data) {
        throw new Error(`${fallbackMessage} ${i18n.t("profile.errors.invalidApiResponse")}`);
    }

    return raw.data;
}

export async function fetchCurrentUser(): Promise<UserResponse> {
    const msg = i18n.t("profile.errors.profileLoadFailed");
    const response = await apiFetch("/api/v1/users/me", {
        errorMessage: msg,
    });

    return readUserResponse(response, msg);
}

export async function updateCurrentUser(data: UpdateUserRequest): Promise<UserResponse> {
    const msg = i18n.t("profile.errors.profileUpdateFailed");
    const response = await apiFetch("/api/v1/users/me", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        errorMessage: msg,
    });

    return readUserResponse(response, msg);
}

export async function fetchSecurityStatus(): Promise<SecurityStatusResponse> {
    const msg = i18n.t("profile.errors.securityLoadFailed");
    const response = await apiFetch("/api/v1/users/me/security", {
        errorMessage: msg,
    });

    return readSecurityStatusResponse(response, msg);
}

export async function changeCurrentUserPassword(newPassword: string): Promise<void> {
    await apiFetch("/api/v1/users/me/password", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
        errorMessage: i18n.t("profile.errors.passwordUpdateFailed"),
    });
}

export async function setupOtp(): Promise<OtpSetupResponse> {
    const msg = i18n.t("profile.errors.otpSetupFailed");
    const response = await apiFetch("/api/v1/users/me/security/otp/setup", {
        method: "POST",
        errorMessage: msg,
    });

    const raw = (await response.json()) as ApiResponse<OtpSetupResponse>;
    if (raw?.success !== true || !raw.data) {
        throw new Error(`${msg} ${i18n.t("profile.errors.invalidApiResponse")}`);
    }
    return raw.data;
}

export async function verifyOtp(code: string): Promise<SecurityStatusResponse> {
    const msg = i18n.t("profile.errors.otpVerifyFailed");
    const response = await apiFetch("/api/v1/users/me/security/otp/verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
        errorMessage: msg,
    });

    return readSecurityStatusResponse(response, msg);
}

export async function deleteOtpCredential(credentialId: string): Promise<SecurityStatusResponse> {
    const msg = i18n.t("profile.errors.otpDeleteFailed");
    const response = await apiFetch(`/api/v1/users/me/security/otp/${encodeURIComponent(credentialId)}`, {
        method: "DELETE",
        errorMessage: msg,
    });

    return readSecurityStatusResponse(response, msg);
}
