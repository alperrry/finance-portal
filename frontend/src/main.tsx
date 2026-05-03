import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/kapital.css";
import "./styles/preferences.css";
import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthProvider";
import { ToastProvider } from "./components/Toast";
import { UiPreferencesProvider } from "./preferences/UiPreferencesContext";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ToastProvider>
            <UiPreferencesProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </UiPreferencesProvider>
        </ToastProvider>
    </StrictMode>
);
