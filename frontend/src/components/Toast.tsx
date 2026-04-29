import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ToastContext, type ToastContextType, type ToastTone } from "./ToastContext";

type ToastItem = {
    id: number;
    message: string;
    tone: ToastTone;
};

type ToastEventDetail = {
    message?: string;
    tone?: ToastTone;
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, tone: ToastTone = "info") => {
            const id = Date.now() + Math.floor(Math.random() * 1000);
            setToasts((current) => [...current, { id, message, tone }]);
            window.setTimeout(() => removeToast(id), 4200);
        },
        [removeToast],
    );

    useEffect(() => {
        const onToast = (event: Event) => {
            const detail = (event as CustomEvent<ToastEventDetail>).detail;
            if (!detail?.message) return;
            showToast(detail.message, detail.tone ?? "info");
        };

        const storedAuthMessage = sessionStorage.getItem("authMessage");
        let authMessageTimer: number | undefined;

        if (storedAuthMessage) {
            sessionStorage.removeItem("authMessage");
            authMessageTimer = window.setTimeout(() => showToast(storedAuthMessage, "error"), 0);
        }

        window.addEventListener("app:toast", onToast);
        return () => {
            window.removeEventListener("app:toast", onToast);
            if (authMessageTimer !== undefined) {
                window.clearTimeout(authMessageTimer);
            }
        };
    }, [showToast]);

    const value = useMemo<ToastContextType>(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="kp-toast-viewport" aria-live="polite" aria-relevant="additions">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`kp-toast ${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
                        <span className="kp-toast-dot" aria-hidden="true" />
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
