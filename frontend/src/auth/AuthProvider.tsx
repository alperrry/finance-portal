import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { keycloak } from "./keycloak";

type AuthContextType = {
    ready: boolean;
    authenticated: boolean;
    login: () => void;
    register: () => void;
    logout: () => void;
    token?: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

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

    const value = useMemo<AuthContextType>(
        () => ({
            ready,
            authenticated,
            login: () => keycloak.login({ redirectUri: window.location.origin + "/portfolio" }),
            register: () => keycloak.register({ redirectUri: window.location.origin + "/portfolio" }),
            logout: () => keycloak.logout({ redirectUri: window.location.origin + "/" }),
            token: keycloak.token,
        }),
        [ready, authenticated]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
