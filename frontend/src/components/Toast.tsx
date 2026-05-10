import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Box } from "@mui/material";
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

const DOT_COLOR: Record<ToastTone, string> = {
    success: "#5bb870",
    error: "#e05858",
    info: "#c1622f",
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
            <Box
                aria-live="polite"
                aria-relevant="additions"
                sx={{
                    position: "fixed",
                    top: 18,
                    right: 18,
                    zIndex: 10000,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    width: "min(380px, calc(100vw - 36px))",
                    pointerEvents: "none",
                }}
            >
                {toasts.map((toast) => (
                    <Box
                        key={toast.id}
                        role={toast.tone === "error" ? "alert" : "status"}
                        sx={{
                            border: "1px solid",
                            borderColor: toast.tone === "error" ? "rgba(224, 88, 88, 0.26)" : "rgba(17, 17, 17, 0.09)",
                            bgcolor: "rgba(255, 255, 255, 0.94)",
                            color: "rgba(17, 17, 17, 0.82)",
                            boxShadow: "0 16px 42px rgba(17, 17, 17, 0.12)",
                            backdropFilter: "blur(18px)",
                            borderRadius: "18px",
                            p: "13px 14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontSize: 13,
                            lineHeight: 1.45,
                            pointerEvents: "auto",
                        }}
                    >
                        <Box
                            aria-hidden="true"
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: DOT_COLOR[toast.tone],
                                flexShrink: 0,
                            }}
                        />
                        <span>{toast.message}</span>
                    </Box>
                ))}
            </Box>
        </ToastContext.Provider>
    );
}
