import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./index.css";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/auth/AuthProvider";
import { ToastProvider } from "./components/Toast";
import { UiPreferencesProvider } from "./app/providers/UiPreferencesProvider";
import { useUiPreferences } from "./app/providers/UiPreferencesContext";
import { kapitalTheme, kapitalDarkTheme } from "./theme/kapitalTheme";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function ThemeSelector({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useUiPreferences();
    return (
        <ThemeProvider theme={resolvedTheme === "dark" ? kapitalDarkTheme : kapitalTheme}>
            {children}
        </ThemeProvider>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <UiPreferencesProvider>
                <ThemeSelector>
                    <CssBaseline />
                    <ToastProvider>
                        <AuthProvider>
                            <App />
                        </AuthProvider>
                    </ToastProvider>
                </ThemeSelector>
            </UiPreferencesProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    </StrictMode>
);
