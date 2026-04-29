import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastContextType = {
    showToast: (message: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
