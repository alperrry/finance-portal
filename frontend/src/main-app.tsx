import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./i18n";
import "./index.css";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/auth/AuthProvider";
import { ToastProvider } from "./components/Toast";
import { UiPreferencesProvider } from "./app/providers/UiPreferencesProvider";
import { AppThemeProvider } from "./app/providers/AppThemeProvider";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <UiPreferencesProvider>
                <AppThemeProvider>
                    <ToastProvider>
                        <AuthProvider>
                            <App />
                        </AuthProvider>
                    </ToastProvider>
                </AppThemeProvider>
            </UiPreferencesProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    </StrictMode>
);
