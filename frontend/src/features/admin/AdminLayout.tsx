import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { LiveBadge } from "./components/LiveBadge/LiveBadge";
import { NotificationBell } from "./components/NotificationBell/NotificationBell";
import { useAdminWebSocket } from "./websocket/useAdminWebSocket";
import { useAuditFeed } from "./websocket/useAuditFeed";
import "./admin.css";

function titleForPath(pathname: string) {
    if (pathname.includes("/admin/users/")) return "Kullanıcı Detayı";
    if (pathname.includes("/admin/users")) return "Kullanıcılar";
    if (pathname.includes("/admin/news-sources")) return "RSS Kaynakları";
    if (pathname.includes("/admin/news")) return "Haber Yönetimi";
    if (pathname.includes("/admin/categories")) return "Kategori Yönetimi";
    if (pathname.includes("/admin/market-jobs")) return "Market İşleri";
    return "Admin";
}

export function AdminLayout() {
    const location = useLocation();
    const { currentUser, logout } = useAuth();
    const auditFeed = useAuditFeed();
    const detailMatch = location.pathname.match(/^\/admin\/users\/(\d+)/);
    const watchedUserId = detailMatch ? Number(detailMatch[1]) : null;
    const { state } = useAdminWebSocket({ onEvent: auditFeed.addEvent, watchedUserId });

    return (
        <div className="admin-shell">
            <aside className="admin-sidebar">
                <button type="button" className="admin-brand" onClick={() => undefined}>
                    <span>◈</span>
                    <strong>Kapital Admin</strong>
                </button>
                <nav aria-label="Admin menü">
                    <NavLink to="/admin" end>Dashboard</NavLink>
                    <NavLink to="/admin/users">Kullanıcılar</NavLink>
                    <NavLink to="/admin/news">Haber Yönetimi</NavLink>
                    <NavLink to="/admin/categories">Kategori Yönetimi</NavLink>
                    <NavLink to="/admin/news-sources">RSS Kaynakları</NavLink>
                    <NavLink to="/admin/market-jobs">Market İşleri</NavLink>
                </nav>
            </aside>
            <div className="admin-main">
                <header className="admin-topbar">
                    <div>
                        <span>Admin Panel</span>
                        <h1>{titleForPath(location.pathname)}</h1>
                    </div>
                    <div className="admin-topbar-actions">
                        <LiveBadge state={state} />
                        <NotificationBell events={auditFeed.events} unreadCount={auditFeed.unreadCount} onOpen={auditFeed.markAllRead} />
                        <button type="button" className="admin-user-chip" onClick={logout}>
                            <span>{(currentUser?.firstName || currentUser?.username || "A").slice(0, 2).toLocaleUpperCase("tr-TR")}</span>
                            <strong>{currentUser?.username ?? "Admin"}</strong>
                        </button>
                    </div>
                </header>
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
