import { useAuth } from "../../../app/auth/AuthContext";

export function useAdminGuard() {
    const { ready, authenticated, currentUser, userLoading } = useAuth();
    const loading = !ready || (authenticated && userLoading && !currentUser);
    const isAdmin = currentUser?.role === "ADMIN";

    return {
        loading,
        authenticated,
        isAdmin,
    };
}
