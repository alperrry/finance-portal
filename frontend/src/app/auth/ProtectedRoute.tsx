import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { ready, authenticated } = useAuth();
    const { t } = useTranslation();

    if (!ready) return <div style={{ padding: 24 }}>{t("auth.loading")}</div>;
    if (!authenticated) return <Navigate to="/" replace />;

    return <>{children}</>;
}
