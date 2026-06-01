import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAdminGuard } from "./hooks/useAdminGuard";

export function AdminGuard() {
    const { t } = useTranslation();
    const location = useLocation();
    const { loading, authenticated, isAdmin } = useAdminGuard();

    if (loading) {
        return <Typography sx={{ p: "22px", color: "text.secondary" }}>{t("admin.guard.loading")}</Typography>;
    }

    if (!authenticated) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    if (!isAdmin) {
        return <Navigate to="/forbidden" replace />;
    }

    return <Outlet />;
}
