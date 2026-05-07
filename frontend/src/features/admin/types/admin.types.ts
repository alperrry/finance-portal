export type AdminUserRole = "NORMAL_USER" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "PASSIVE";

export type AdminUserListItem = {
    id: number;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: AdminUserRole;
    status: AdminUserStatus;
    active: boolean;
    twoFactorEnabled: boolean | null;
    portfolioCount: number | null;
    lastLoginAt: string | null;
    createdAt: string | null;
};

export type AdminUserDetail = AdminUserListItem & {
    updatedAt?: string | null;
    balance?: number | null;
};

export type UpdateUserRoleRequest = {
    role: AdminUserRole;
    reason: string;
};

export type UpdateUserStatusRequest = {
    status: AdminUserStatus;
    reason: string;
};

export type ResetUser2FARequest = {
    reason: string;
};

export type AuditLogItem = {
    id: number;
    actorUsername: string | null;
    action: string;
    targetType: string;
    targetId: number | null;
    targetSnapshot?: Record<string, unknown> | null;
    reason: string | null;
    createdAt: string | null;
    timestamp?: string | null;
};

export type AdminNewsSource = {
    id: number;
    name: string;
    sourceUrl: string;
    active: boolean;
    createdAt: string | null;
    updatedAt: string | null;
};

export type AdminNewsSourceRequest = {
    name: string;
    sourceUrl: string;
};

export type AdminFetchResponse = {
    source: string;
    status: "TRIGGERED" | "ALREADY_RUNNING" | string;
    message: string;
    triggeredAt: string | null;
};

export type AdminMarketBackfillModule = "fx" | "stocks" | "bonds" | "funds";

export type AdminBackfillResponse = {
    module: AdminMarketBackfillModule | string;
    status: "TRIGGERED" | "ALREADY_RUNNING" | string;
    message: string;
    triggeredAt: string | null;
};

export type AdminNewsStatus = "published" | "archived" | "removed";

export type AdminCategory = {
    id: number;
    name: string;
    active: boolean;
    createdAt: string | null;
    updatedAt: string | null;
};

export type AdminCategoryRequest = {
    name: string;
    isActive?: boolean;
};

export type AdminNewsSummary = {
    id: number;
    title: string;
    context: string;
    publishedAt: string | null;
    canonicalUrl: string | null;
    externalId: string | null;
    imageUrl: string | null;
    status: AdminNewsStatus;
    source: {
        id: number;
        name: string;
        url: string | null;
    } | null;
    categories: Array<{
        id: number;
        name: string;
    }>;
    createdAt: string | null;
    updatedAt: string | null;
};

export type AdminNewsQuery = {
    search: string;
    status: AdminNewsStatus | "";
    sourceId: number | "";
    categoryId: number | "";
    page: number;
    size: number;
};

export type AdminPageResponse<T> = {
    content: T[];
    number: number;
    size: number;
    totalPages: number;
    totalElements: number;
    first: boolean;
    last: boolean;
};

export type WebSocketEnvelope<T> = {
    type: string;
    timestamp: string;
    data: T;
};

export type AdminAuditEventPayload = {
    id?: number;
    actorUsername?: string | null;
    action?: string;
    targetType?: string;
    targetId?: number;
    targetSnapshot?: Record<string, unknown> | null;
    reason?: string | null;
};

export type AdminUserChangedPayload = {
    userId: number;
    oldRole?: AdminUserRole;
    newRole?: AdminUserRole;
    oldStatus?: AdminUserStatus;
    newStatus?: AdminUserStatus;
    changedBy?: string;
};

export type AdminEvent = {
    id: string;
    type: string;
    timestamp: string;
    title: string;
    description: string;
    unread: boolean;
};

export type AdminUsersFilter = {
    search: string;
    role: AdminUserRole | "";
    status: AdminUserStatus | "";
};
