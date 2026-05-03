import { keycloak } from "../auth/keycloak";

export type ApiAuthMode = "required" | "optional" | "none";

export type ApiErrorPayload = {
    errorCode?: string;
    timestamp?: string;
    status?: number;
    error?: string;
    message?: string;
    path?: string;
};

export class ApiError extends Error {
    status: number;
    payload: ApiErrorPayload | null;

    constructor(message: string, status: number, payload: ApiErrorPayload | null = null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
    }
}

type ApiFetchOptions = RequestInit & {
    auth?: ApiAuthMode;
    errorMessage?: string;
};

export const API_BASE = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? "";

let loginRedirectInProgress = false;

function emitToast(message: string, tone: "success" | "error" | "info" = "info") {
    window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, tone } }));
}

function redirectToLogin(message = "Oturum süreniz doldu. Yeniden girişe yönlendiriliyorsunuz.") {
    if (loginRedirectInProgress) return;

    loginRedirectInProgress = true;
    sessionStorage.setItem("authMessage", message);
    emitToast(message, "error");

    void keycloak
        .login({ redirectUri: window.location.href })
        .catch(() => {
            loginRedirectInProgress = false;
            window.location.assign("/");
        });
}

function buildApiUrl(input: RequestInfo | URL) {
    if (input instanceof URL) return input;
    if (input instanceof Request) return input;
    if (/^https?:\/\//i.test(input)) return input;
    return `${API_BASE}${input}`;
}

function createAuthError(message: string) {
    return new ApiError(message, 401, {
        status: 401,
        error: "Unauthorized",
        message,
    });
}

async function getAccessToken(authMode: ApiAuthMode) {
    if (authMode === "none") return undefined;

    if (!keycloak.authenticated) {
        if (authMode === "required") {
            const message = "Oturum bulunamadı. Giriş sayfasına yönlendiriliyorsunuz.";
            redirectToLogin(message);
            throw createAuthError(message);
        }

        return undefined;
    }

    try {
        await keycloak.updateToken(30);
    } catch {
        const message = "Oturum süreniz doldu. Yeniden girişe yönlendiriliyorsunuz.";
        redirectToLogin(message);
        throw createAuthError(message);
    }

    if (!keycloak.token) {
        const message = "Oturum anahtarı alınamadı. Yeniden girişe yönlendiriliyorsunuz.";
        redirectToLogin(message);
        throw createAuthError(message);
    }

    return keycloak.token;
}

async function readErrorPayload(response: Response): Promise<ApiErrorPayload | null> {
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
        return null;
    }

    try {
        return (await response.json()) as ApiErrorPayload;
    } catch {
        return null;
    }
}

export async function createApiError(response: Response, fallbackMessage = "Bir hata oluştu, tekrar deneyin.") {
    const payload = await readErrorPayload(response);
    const message = payload?.message || payload?.error || fallbackMessage;
    return new ApiError(message, response.status, payload);
}

export async function apiFetch(input: RequestInfo | URL, options: ApiFetchOptions = {}) {
    const { auth = "required", errorMessage, headers: providedHeaders, ...init } = options;
    const headers = new Headers(providedHeaders);
    const token = await getAccessToken(auth);

    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(buildApiUrl(input), {
        ...init,
        headers,
    });

    if (response.status === 401) {
        if (auth === "required" || keycloak.authenticated) {
            redirectToLogin();
        }

        throw await createApiError(response, "Oturum süreniz doldu. Lütfen tekrar giriş yapın.");
    }

    if (!response.ok) {
        throw await createApiError(response, errorMessage);
    }

    return response;
}
