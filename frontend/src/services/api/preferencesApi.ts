// =====================================================================
// Konum: frontend/src/services/api/preferencesApi.ts
//
// Backend ile tercih senkronizasyonu.
// apiFetch zaten auth/token/401-redirect/error işlerini halleder;
// burada sadece endpoint + payload tipleri + ApiResponse zarfını açma var.
// =====================================================================

import { apiFetch } from "./client";
import i18n from "../../i18n";

// Backend'in döndürdüğü/aldığı tipler (küçük harf string'ler — controller mapper'ı .toLowerCase() ile yolluyor).
export type ThemeValue = "light" | "dark" | "system";
export type LocaleValue = "tr" | "en";

export type PreferencesPayload = {
    theme: ThemeValue;
    locale: LocaleValue;
    densityCompact: boolean;
    reduceMotion: boolean;
};

// ApiResponse<T> zarfı muhtemelen { data: T, ... } şeklinde.
// Helper, hem zarflı hem zarfsız yanıtlarla çalışır — backend nasıl döndürürse dönsün uyar.
type MaybeEnvelope<T> = T | { data: T };

async function unwrap<T>(response: Response): Promise<T> {
    const body = (await response.json()) as MaybeEnvelope<T>;
    if (body && typeof body === "object" && "data" in body) {
        return (body as { data: T }).data;
    }
    return body as T;
}

// GET /api/me/preferences -> kullanıcının mevcut tercihleri (yoksa backend default oluşturur)
export async function fetchMyPreferences(): Promise<PreferencesPayload> {
    const response = await apiFetch("/api/me/preferences", {
        method: "GET",
        errorMessage: i18n.t("common.preferencesFailed"),
    });
    return unwrap<PreferencesPayload>(response);
}

// PUT /api/me/preferences -> tam güncelleme; backend kaydedilmiş halini döner
export async function updateMyPreferences(
    payload: PreferencesPayload,
): Promise<PreferencesPayload> {
    const response = await apiFetch("/api/me/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        errorMessage: i18n.t("common.preferencesFailed"),
    });
    return unwrap<PreferencesPayload>(response);
}