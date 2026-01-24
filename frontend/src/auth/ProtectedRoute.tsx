import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { ready, authenticated } = useAuth();

    if (!ready) return <div style={{ padding: 24 }}>Yükleniyor...</div>;
    if (!authenticated) return <Navigate to="/" replace />;

    return <>{children}</>;
}
