import { useState } from "react";
import type { AdminEvent } from "../../types/admin.types";

function formatEventTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function NotificationBell({
    events,
    unreadCount,
    onOpen,
}: {
    events: AdminEvent[];
    unreadCount: number;
    onOpen: () => void;
}) {
    const [open, setOpen] = useState(false);

    const toggle = () => {
        setOpen((current) => {
            const next = !current;
            if (next) onOpen();
            return next;
        });
    };

    return (
        <div className="admin-notification-wrap">
            <button type="button" className="admin-icon-button" onClick={toggle} aria-label="Admin bildirimleri">
                <span aria-hidden="true">●</span>
                {unreadCount > 0 ? <em>{unreadCount > 9 ? "9+" : unreadCount}</em> : null}
            </button>
            {open ? (
                <div className="admin-notification-menu">
                    <div className="admin-notification-head">
                        <strong>Bildirimler</strong>
                        <a href="/admin/users">Tümünü gör</a>
                    </div>
                    {events.length === 0 ? (
                        <p className="admin-empty-small">Yeni admin olayı yok.</p>
                    ) : (
                        events.slice(0, 10).map((event) => (
                            <article key={event.id} className={event.unread ? "unread" : ""}>
                                <div>
                                    <strong>{event.title}</strong>
                                    <span>{event.description}</span>
                                </div>
                                <time>{formatEventTime(event.timestamp)}</time>
                            </article>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}
