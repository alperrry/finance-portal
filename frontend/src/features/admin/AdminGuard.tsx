import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminGuard } from "./hooks/useAdminGuard";
import "./admin.css";

export function AdminGuard() {
    const location = useLocation();
    const { loading, authenticated, isAdmin } = useAdminGuard();

    if (loading) {
        return <div className="admin-route-loading">Yükleniyor...</div>;
    }

    if (!authenticated) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    if (!isAdmin) {
        return <Navigate to="/forbidden" replace />;
    }

    return <Outlet />;
}
