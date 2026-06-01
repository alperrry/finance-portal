import i18n from "../../../i18n";
import type { AdminNewsStatus, AdminUserListItem, AuditLogItem } from "../types/admin.types";

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function displayName(user: AdminUserListItem): string {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
}

export function auditTime(item: AuditLogItem): string {
    return formatDateTime(item.createdAt ?? item.timestamp ?? null);
}

export function newsStatusLabel(status: AdminNewsStatus): string {
    if (status === "archived") return i18n.t("admin.formatters.archived");
    if (status === "removed") return i18n.t("admin.formatters.removed");
    return i18n.t("admin.formatters.published");
}
