import { useCallback, useState } from "react";
import type { AdminEvent } from "../types/admin.types";

export function useAuditFeed() {
    const [events, setEvents] = useState<AdminEvent[]>([]);

    const addEvent = useCallback((event: AdminEvent) => {
        setEvents((current) => [event, ...current].slice(0, 10));
    }, []);

    const markAllRead = useCallback(() => {
        setEvents((current) => current.map((event) => ({ ...event, unread: false })));
    }, []);

    return {
        events,
        unreadCount: events.filter((event) => event.unread).length,
        addEvent,
        markAllRead,
    };
}
