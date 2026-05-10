import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../app/auth/AuthContext";
import { websocketClient } from "../../../services/websocketClient";
import { useToast } from "../../../components/ToastContext";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import type {
    AdminAuditEventPayload,
    AdminEvent,
    AdminUserChangedPayload,
    WebSocketEnvelope,
} from "../types/admin.types";

export type AdminConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

type UseAdminWebSocketOptions = {
    onEvent?: (event: AdminEvent) => void;
    watchedUserId?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isAdminAuditPayload(value: unknown): value is AdminAuditEventPayload {
    return isRecord(value) && typeof value.action === "string";
}

function isAdminUserChangedPayload(value: unknown): value is AdminUserChangedPayload {
    return isRecord(value) && typeof value.userId === "number";
}

function eventId(envelope: WebSocketEnvelope<unknown>) {
    return `${envelope.type}-${envelope.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
}

function auditEvent(envelope: WebSocketEnvelope<unknown>, payload: AdminAuditEventPayload): AdminEvent {
    const target = payload.targetType && payload.targetId ? `${payload.targetType} #${payload.targetId}` : "Sistem";
    return {
        id: eventId(envelope),
        type: envelope.type,
        timestamp: envelope.timestamp,
        title: payload.action ?? "Audit kaydı",
        description: `${payload.actorUsername ?? "Sistem"} -> ${target}${payload.reason ? `: ${payload.reason}` : ""}`,
        unread: true,
    };
}

function userEvent(envelope: WebSocketEnvelope<unknown>, payload: AdminUserChangedPayload): AdminEvent {
    return {
        id: eventId(envelope),
        type: envelope.type,
        timestamp: envelope.timestamp,
        title: "Kullanıcı güncellendi",
        description: `Kullanıcı #${payload.userId}${payload.changedBy ? `, ${payload.changedBy} tarafından` : ""} güncellendi.`,
        unread: true,
    };
}

export function useAdminWebSocket({ onEvent, watchedUserId }: UseAdminWebSocketOptions = {}) {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [state, setState] = useState<AdminConnectionState>("connecting");

    useEffect(() => {
        if (!token) {
            return undefined;
        }

        websocketClient.connect(token);

        const connectedListener = () => setState("connected");
        const offlineListener = () => setState("offline");
        window.addEventListener("portfolio-ws:connected", connectedListener);
        window.addEventListener("offline", offlineListener);
        window.addEventListener("online", connectedListener);

        const statusTimer = window.setInterval(() => {
            if (!navigator.onLine) {
                setState("offline");
                return;
            }
            setState(websocketClient.isConnected() ? "connected" : "reconnecting");
        }, 3000);

        const unsubscribeAudit = websocketClient.subscribe("/topic/admin/audit", (envelope) => {
            const adminEnvelope = envelope as WebSocketEnvelope<unknown>;
            if (adminEnvelope.type !== "ADMIN_AUDIT_LOGGED" || !isAdminAuditPayload(adminEnvelope.data)) return;

            const payload = adminEnvelope.data;
            onEvent?.(auditEvent(adminEnvelope, payload));
            if (payload.targetType === "user" && payload.targetId) {
                invalidateAdminQuery({ scope: "audit-trail", userId: payload.targetId });
                if (payload.targetId === watchedUserId) invalidateAdminQuery({ scope: "user-detail", userId: payload.targetId });
            }
            if (payload.targetType === "source" || payload.targetType === "news") {
                invalidateAdminQuery({ scope: "news-audit" });
                if (payload.targetType === "source") invalidateAdminQuery({ scope: "news-sources" });
                if (payload.targetType === "news") invalidateAdminQuery({ scope: "news-list" });
            }
            if (payload.targetType === "category") {
                invalidateAdminQuery({ scope: "categories" });
                invalidateAdminQuery({ scope: "category-audit" });
                invalidateAdminQuery({ scope: "news-list" });
            }
            if (payload.targetType === "market") {
                invalidateAdminQuery({ scope: "market-audit" });
            }
        });

        const unsubscribeUsers = websocketClient.subscribe("/topic/admin/users", (envelope) => {
            const adminEnvelope = envelope as WebSocketEnvelope<unknown>;
            if (!isAdminUserChangedPayload(adminEnvelope.data)) return;

            const payload = adminEnvelope.data;
            invalidateAdminQuery({ scope: "users" });
            invalidateAdminQuery({ scope: "user-detail", userId: payload.userId });
            onEvent?.(userEvent(adminEnvelope, payload));
            showToast(`Kullanıcı #${payload.userId} güncellendi.`, "info");
        });

        return () => {
            unsubscribeAudit();
            unsubscribeUsers();
            window.clearInterval(statusTimer);
            window.removeEventListener("portfolio-ws:connected", connectedListener);
            window.removeEventListener("offline", offlineListener);
            window.removeEventListener("online", connectedListener);
            websocketClient.disconnectIfIdle();
        };
    }, [onEvent, showToast, token, watchedUserId]);

    return useMemo(() => ({ state: token ? state : "offline" }), [state, token]);
}
