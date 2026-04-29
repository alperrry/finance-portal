import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError } from "../api/client";
import { fetchCurrentUser, type UserResponse } from "../api/user";
import { AuthContext, type AuthContextType } from "./AuthContext";
import { keycloak } from "./keycloak";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [ready, setReady] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);

    useEffect(() => {
        keycloak
            .init({
                onLoad: "check-sso",
                pkceMethod: "S256",      // SPA için doğru yöntem
                checkLoginIframe: false, // dev ortamda daha stabil
            })
            .then((auth) => {
                setAuthenticated(auth);
                setReady(true);
            })
            .catch(() => {
                setAuthenticated(false);
                setReady(true);
            });
    }, []);

    const refreshCurrentUser = useCallback(async () => {
        if (!authenticated) {
            setCurrentUser(null);
            setUserError(null);
            setUserLoading(false);
            return null;
        }

        setUserLoading(true);
        setUserError(null);

        try {
            const user = await fetchCurrentUser();
            setCurrentUser(user);
            return user;
        } catch (caughtError) {
            const message =
                caughtError instanceof ApiError && caughtError.status === 403
                    ? "Bu işleme yetkiniz yok"
                    : caughtError instanceof Error
                      ? caughtError.message
                      : "Kullanıcı bilgileri yüklenemedi.";

            setUserError(message);
            return null;
        } finally {
            setUserLoading(false);
        }
    }, [authenticated]);

    useEffect(() => {
        if (!ready) return;

        if (!authenticated) {
            setCurrentUser(null);
            setUserError(null);
            setUserLoading(false);
            return;
        }

        void refreshCurrentUser();
    }, [ready, authenticated, refreshCurrentUser]);

    const value = useMemo<AuthContextType>(
        () => ({
            ready,
            authenticated,
            login: () => keycloak.login({ redirectUri: window.location.origin + "/portfolio" }),
            register: () => keycloak.register({ redirectUri: window.location.origin + "/portfolio" }),
            logout: () => keycloak.logout({ redirectUri: window.location.origin + "/" }),
            currentUser,
            userLoading,
            userError,
            refreshCurrentUser,
            setCurrentUser,
            token: keycloak.token,
        }),
        [ready, authenticated, currentUser, userLoading, userError, refreshCurrentUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
