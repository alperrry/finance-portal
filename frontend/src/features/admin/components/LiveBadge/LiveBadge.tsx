import type { AdminConnectionState } from "../../websocket/useAdminWebSocket";

const LABELS: Record<AdminConnectionState, string> = {
    connecting: "Bağlanıyor",
    connected: "Live",
    reconnecting: "Reconnecting...",
    offline: "Offline",
};

export function LiveBadge({ state }: { state: AdminConnectionState }) {
    return (
        <span className={`admin-live-badge ${state}`}>
            <span aria-hidden="true" />
            {LABELS[state]}
        </span>
    );
}
