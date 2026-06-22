import { apiFetch } from "../../../services/api/client";
import i18n from "../../../i18n";
import type {
    AdminUserRole,
    AdminUserStatus,
    AdminUserDetail,
    AdminUserListItem,
    AdminDashboardSummary,
    AdminModuleFreshness,
    AdminBackfillResponse,
    AdminCategory,
    AdminCategoryRequest,
    AdminFetchResponse,
    AdminMarketBackfillModule,
    AdminNewsQuery,
    AdminNewsSource,
    AdminNewsSourceRequest,
    AdminNewsStatus,
    AdminNewsSummary,
    AdminPageResponse,
    AuditLogItem,
    ResetUser2FARequest,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
} from "../types/admin.types";

type ApiResponse<T> = {
    success?: boolean;
    data?: T;
};

type PageResponse<T> = {
    content?: T[];
    number?: number;
    size?: number;
    totalPages?: number;
    totalElements?: number;
    first?: boolean;
    last?: boolean;
    page?: {
        number?: number;
        size?: number;
        totalPages?: number;
        totalElements?: number;
    };
};

async function readData<T>(response: Response, fallbackMessage: string): Promise<T> {
    const raw = (await response.json()) as ApiResponse<T> | T;
    if (raw && typeof raw === "object" && "data" in raw) {
        const wrapped = raw as ApiResponse<T>;
        if (wrapped.data !== undefined) return wrapped.data;
    }
    if (raw !== undefined && raw !== null) return raw as T;
    throw new Error(`${fallbackMessage} Geçersiz API cevabı alındı.`);
}

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
    const response = await apiFetch("/api/v1/admin/users", {
        errorMessage: i18n.t("admin.users.loadError"),
    });
    const raw = await readData<unknown[] | PageResponse<unknown>>(response, i18n.t("admin.users.loadError"));
    const users = Array.isArray(raw) ? raw : raw.content ?? [];
    return users.map(normalizeUserListItem);
}

export async function fetchAdminUserDetail(userId: number): Promise<AdminUserDetail> {
    const response = await apiFetch(`/api/v1/admin/users/${userId}`, {
        errorMessage: "Kullanıcı detayı yüklenemedi.",
    });
    return normalizeUserDetail(await readData<unknown>(response, "Kullanıcı detayı yüklenemedi."));
}

export async function updateAdminUserRole(userId: number, payload: UpdateUserRoleRequest): Promise<AdminUserDetail> {
    const response = await apiFetch(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole: payload.role, reason: payload.reason }),
        errorMessage: "Rol güncellenemedi.",
    });
    return readData<AdminUserDetail>(response, "Rol güncellenemedi.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
    return typeof value === "string" ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown, fallback = false) {
    return typeof value === "boolean" ? value : fallback;
}

function roleValue(value: unknown): AdminUserRole {
    return value === "ADMIN" ? "ADMIN" : "NORMAL_USER";
}

function statusValue(value: unknown, activeValue: unknown): AdminUserStatus {
    if (value === "ACTIVE" || value === "PASSIVE") return value;
    if (typeof activeValue === "boolean") return activeValue ? "ACTIVE" : "PASSIVE";
    return "ACTIVE";
}

function normalizeUserListItem(value: unknown): AdminUserListItem {
    if (!isRecord(value)) {
        throw new Error("Kullanıcı verisi okunamadı.");
    }

    const status = statusValue(value.status, value.isActive ?? value.active);
    const active = status === "ACTIVE";

    return {
        id: numberValue(value.id),
        username: stringValue(value.username),
        email: stringValue(value.email),
        firstName: nullableString(value.firstName),
        lastName: nullableString(value.lastName),
        role: roleValue(value.role),
        status,
        active,
        twoFactorEnabled: typeof value.twoFactorEnabled === "boolean"
            ? value.twoFactorEnabled
            : typeof value.otpEnabled === "boolean"
              ? value.otpEnabled
              : null,
        portfolioCount: nullableNumber(value.portfolioCount),
        lastLoginAt: nullableString(value.lastLoginAt),
        createdAt: nullableString(value.createdAt),
    };
}

function normalizeUserDetail(value: unknown): AdminUserDetail {
    const base = normalizeUserListItem(value);
    const record = isRecord(value) ? value : {};
    return {
        ...base,
        updatedAt: nullableString(record.updatedAt),
        balance: nullableNumber(record.balance),
        active: booleanValue(record.active ?? record.isActive, base.active),
    };
}

export async function updateAdminUserStatus(userId: number, payload: UpdateUserStatusRequest): Promise<AdminUserDetail> {
    const response = await apiFetch(`/api/v1/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: payload.status === "ACTIVE", reason: payload.reason }),
        errorMessage: "Durum güncellenemedi.",
    });
    return readData<AdminUserDetail>(response, "Durum güncellenemedi.");
}

export async function resetAdminUser2FA(userId: number, payload: ResetUser2FARequest): Promise<void> {
    await apiFetch(`/api/v1/admin/users/${userId}/reset-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        errorMessage: "İki aşamalı doğrulama sıfırlanamadı.",
    });
}

export async function fetchAdminUserAuditTrail(userId: number): Promise<AuditLogItem[]> {
    const response = await apiFetch(`/api/v1/admin/users/${userId}/audit-trail`, {
        errorMessage: "Audit kayıtları yüklenemedi.",
    });
    const raw = await readData<AuditLogItem[] | PageResponse<AuditLogItem>>(response, "Audit kayıtları yüklenemedi.");
    return Array.isArray(raw) ? raw : raw.content ?? [];
}

function normalizeSource(value: unknown): AdminNewsSource {
    if (!isRecord(value)) {
        throw new Error("Kaynak verisi okunamadı.");
    }
    return {
        id: numberValue(value.id),
        name: stringValue(value.name),
        sourceUrl: stringValue(value.sourceUrl),
        active: booleanValue(value.active, true),
        createdAt: nullableString(value.createdAt),
        updatedAt: nullableString(value.updatedAt),
    };
}

function normalizeCategory(value: unknown): AdminCategory {
    if (!isRecord(value)) {
        throw new Error("Kategori verisi okunamadı.");
    }
    return {
        id: numberValue(value.id),
        name: stringValue(value.name),
        active: booleanValue(value.isActive ?? value.active, true),
        createdAt: nullableString(value.createdAt),
        updatedAt: nullableString(value.updatedAt),
    };
}

function newsStatusValue(value: unknown): AdminNewsStatus {
    if (value === "archived" || value === "removed") return value;
    return "published";
}

function normalizeNewsSummary(value: unknown): AdminNewsSummary {
    if (!isRecord(value)) {
        throw new Error("Haber verisi okunamadı.");
    }
    const rawSource = isRecord(value.source) ? value.source : null;
    const rawCategories = Array.isArray(value.categories) ? value.categories : [];
    return {
        id: numberValue(value.id),
        title: stringValue(value.title),
        context: stringValue(value.context),
        publishedAt: nullableString(value.publishedAt),
        canonicalUrl: nullableString(value.canonicalUrl),
        externalId: nullableString(value.externalId),
        imageUrl: nullableString(value.imageUrl),
        status: newsStatusValue(value.status),
        source: rawSource
            ? {
                  id: numberValue(rawSource.id),
                  name: stringValue(rawSource.name, "Bilinmeyen Kaynak"),
                  url: nullableString(rawSource.url),
              }
            : null,
        categories: rawCategories
            .filter(isRecord)
            .map((category) => ({
                id: numberValue(category.id),
                name: stringValue(category.name),
            }))
            .filter((category) => category.id > 0 && category.name.length > 0),
        createdAt: nullableString(value.createdAt),
        updatedAt: nullableString(value.updatedAt),
    };
}

function normalizePage<T>(raw: PageResponse<unknown> | unknown[], mapper: (value: unknown) => T, fallbackSize: number): AdminPageResponse<T> {
    if (Array.isArray(raw)) {
        return {
            content: raw.map(mapper),
            number: 0,
            size: raw.length,
            totalPages: raw.length > 0 ? 1 : 0,
            totalElements: raw.length,
            first: true,
            last: true,
        };
    }
    const page = raw.page ?? {};
    const number = raw.number ?? page.number ?? 0;
    const size = raw.size ?? page.size ?? fallbackSize;
    const totalPages = raw.totalPages ?? page.totalPages ?? 0;
    return {
        content: (raw.content ?? []).map(mapper),
        number,
        size,
        totalPages,
        totalElements: raw.totalElements ?? page.totalElements ?? 0,
        first: raw.first ?? (number <= 0),
        last: raw.last ?? (totalPages <= 1 || number >= totalPages - 1),
    };
}

function normalizeAuditLog(value: unknown): AuditLogItem {
    if (!isRecord(value)) {
        throw new Error("Audit verisi okunamadı.");
    }
    return {
        id: numberValue(value.id),
        actorUsername: nullableString(value.actorUsername),
        action: stringValue(value.action),
        targetType: stringValue(value.targetType),
        targetId: nullableNumber(value.targetId),
        targetSnapshot: isRecord(value.targetSnapshot) ? value.targetSnapshot : null,
        reason: nullableString(value.reason),
        createdAt: nullableString(value.createdAt),
        timestamp: nullableString(value.timestamp),
    };
}

async function readActionResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
    return readData<T>(response, fallbackMessage);
}

export async function fetchAdminNewsSources(): Promise<AdminNewsSource[]> {
    const response = await apiFetch("/api/v1/admin/news/sources", {
        errorMessage: i18n.t("admin.sources.loadError"),
    });
    const raw = await readData<unknown[] | PageResponse<unknown>>(response, i18n.t("admin.sources.loadError"));
    const sources = Array.isArray(raw) ? raw : raw.content ?? [];
    return sources.map(normalizeSource);
}

export async function createAdminNewsSource(payload: AdminNewsSourceRequest): Promise<AdminNewsSource> {
    const response = await apiFetch("/api/v1/admin/news/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        errorMessage: "RSS kaynağı oluşturulamadı.",
    });
    return normalizeSource(await readData<unknown>(response, "RSS kaynağı oluşturulamadı."));
}

export async function updateAdminNewsSource(sourceId: number, payload: AdminNewsSourceRequest): Promise<AdminNewsSource> {
    const response = await apiFetch(`/api/v1/admin/news/sources/${sourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        errorMessage: "RSS kaynağı güncellenemedi.",
    });
    return normalizeSource(await readData<unknown>(response, "RSS kaynağı güncellenemedi."));
}

export async function deleteAdminNewsSource(sourceId: number): Promise<void> {
    await apiFetch(`/api/v1/admin/news/sources/${sourceId}`, {
        method: "DELETE",
        errorMessage: i18n.t("admin.sources.deleteError"),
    });
}

export async function triggerAdminNewsFetch(sourceId?: number): Promise<AdminFetchResponse> {
    const path = sourceId ? `/api/v1/admin/news/fetch/${sourceId}` : "/api/v1/admin/news/fetch";
    const response = await apiFetch(path, {
        method: "POST",
        errorMessage: i18n.t("admin.sources.fetchError"),
    });
    return readActionResponse<AdminFetchResponse>(response, i18n.t("admin.sources.fetchError"));
}

export async function fetchAdminNews(query: AdminNewsQuery): Promise<AdminPageResponse<AdminNewsSummary>> {
    const params = new URLSearchParams();
    if (query.search.trim()) params.set("search", query.search.trim());
    if (query.status) params.set("status", query.status);
    if (query.sourceId) params.set("sourceId", String(query.sourceId));
    if (query.categoryId) params.set("categoryId", String(query.categoryId));
    params.set("page", String(query.page));
    params.set("size", String(query.size));
    params.set("sort", "createdAt,desc");
    const response = await apiFetch(`/api/v1/admin/news?${params.toString()}`, {
        errorMessage: i18n.t("admin.news.loadError"),
    });
    const raw = await readData<PageResponse<unknown> | unknown[]>(response, i18n.t("admin.news.loadError"));
    return normalizePage(raw, normalizeNewsSummary, query.size);
}

export async function updateAdminNewsStatus(newsId: number, status: AdminNewsStatus): Promise<AdminNewsSummary> {
    const response = await apiFetch(`/api/v1/admin/news/${newsId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        errorMessage: i18n.t("admin.news.statusError"),
    });
    return normalizeNewsSummary(await readData<unknown>(response, i18n.t("admin.news.statusError")));
}

export async function updateAdminNewsCategories(newsId: number, categoryIds: number[]): Promise<AdminNewsSummary> {
    const response = await apiFetch(`/api/v1/admin/news/${newsId}/categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds }),
        errorMessage: i18n.t("admin.news.categoriesError"),
    });
    return normalizeNewsSummary(await readData<unknown>(response, i18n.t("admin.news.categoriesError")));
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
    const response = await apiFetch("/api/v1/admin/categories", {
        errorMessage: i18n.t("admin.categories.loadError"),
    });
    const raw = await readData<unknown[] | PageResponse<unknown>>(response, i18n.t("admin.categories.loadError"));
    const categories = Array.isArray(raw) ? raw : raw.content ?? [];
    return categories.map(normalizeCategory);
}

export async function createAdminCategory(payload: AdminCategoryRequest): Promise<AdminCategory> {
    const response = await apiFetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        errorMessage: "Kategori oluşturulamadı.",
    });
    return normalizeCategory(await readData<unknown>(response, "Kategori oluşturulamadı."));
}

export async function updateAdminCategory(categoryId: number, payload: AdminCategoryRequest): Promise<AdminCategory> {
    const response = await apiFetch(`/api/v1/admin/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        errorMessage: "Kategori güncellenemedi.",
    });
    return normalizeCategory(await readData<unknown>(response, "Kategori güncellenemedi."));
}

export async function deleteAdminCategory(categoryId: number): Promise<void> {
    await apiFetch(`/api/v1/admin/categories/${categoryId}`, {
        method: "DELETE",
        errorMessage: i18n.t("admin.categories.deleteError"),
    });
}

export async function triggerAdminMarketBackfill(module: AdminMarketBackfillModule): Promise<AdminBackfillResponse> {
    const response = await apiFetch(`/api/v1/admin/market/backfill/${module}`, {
        method: "POST",
        errorMessage: i18n.t("admin.marketJobs.backfillError"),
    });
    return readActionResponse<AdminBackfillResponse>(response, i18n.t("admin.marketJobs.backfillError"));
}

export async function clearAdminMarketData(module: AdminMarketBackfillModule): Promise<number> {
    const response = await apiFetch(`/api/v1/admin/market/clear/${module}`, {
        method: "DELETE",
        errorMessage: "Market verisi temizlenemedi.",
    });
    const data = await readData<number>(response, "Market verisi temizlenemedi.");
    return typeof data === "number" ? data : 0;
}

function normalizeDashboard(value: unknown): AdminDashboardSummary {
    const root = isRecord(value) ? value : {};
    const c = isRecord(root.counts) ? root.counts : {};
    const rawFreshness = Array.isArray(root.marketFreshness) ? root.marketFreshness : [];
    return {
        counts: {
            totalUsers: numberValue(c.totalUsers),
            activeUsers: numberValue(c.activeUsers),
            adminUsers: numberValue(c.adminUsers),
            totalNews: numberValue(c.totalNews),
            news24h: numberValue(c.news24h),
            publishedNews: numberValue(c.publishedNews),
            totalSources: numberValue(c.totalSources),
            activeSources: numberValue(c.activeSources),
            totalCategories: numberValue(c.totalCategories),
            audit24h: numberValue(c.audit24h),
        },
        marketFreshness: rawFreshness.filter(isRecord).map((m): AdminModuleFreshness => ({
            module: stringValue(m.module),
            lastUpdated: nullableString(m.lastUpdated),
            recordCount: numberValue(m.recordCount),
            stale: booleanValue(m.stale, false),
        })),
    };
}

export async function fetchAdminDashboard(): Promise<AdminDashboardSummary> {
    const response = await apiFetch("/api/v1/admin/dashboard", {
        errorMessage: i18n.t("admin.dashboard.loadError"),
    });
    return normalizeDashboard(await readData<unknown>(response, i18n.t("admin.dashboard.loadError")));
}

export async function fetchAdminAuditLogs(targetTypes: string[]): Promise<AuditLogItem[]> {
    const params = new URLSearchParams();
    targetTypes.forEach((targetType) => params.append("targetType", targetType));
    params.set("size", "20");
    const response = await apiFetch(`/api/v1/admin/audit?${params.toString()}`, {
        errorMessage: "Audit kayıtları yüklenemedi.",
    });
    const raw = await readData<unknown[] | PageResponse<unknown>>(response, "Audit kayıtları yüklenemedi.");
    const logs = Array.isArray(raw) ? raw : raw.content ?? [];
    return logs.map(normalizeAuditLog);
}
