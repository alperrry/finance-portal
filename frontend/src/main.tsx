import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/kapital.css";
import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthProvider";
import { ToastProvider } from "./components/Toast";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ToastProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ToastProvider>
    </StrictMode>
);
