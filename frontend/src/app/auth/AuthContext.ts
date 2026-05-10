import { createContext, useContext } from "react";
import type { UserResponse } from "../../features/profile/api/userApi";

export type AuthContextType = {
    ready: boolean;
    authenticated: boolean;
    login: () => void;
    register: () => void;
    logout: () => void;
    currentUser: UserResponse | null;
    userLoading: boolean;
    userError: string | null;
    refreshCurrentUser: () => Promise<UserResponse | null>;
    setCurrentUser: (user: UserResponse | null) => void;
    token?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
