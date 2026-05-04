import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./pages/HomePage";
import MarketPage from "./pages/MarketPage";
import PortfolioDashboardPage, { PortfolioDetailPage } from "./pages/PortfolioDashboardPage";
import InstrumentDetailPage from "./pages/InstrumentDetailPage";
import AnalysisPage from "./pages/AnalysisPage";
import NewsList from "./pages/NewsList";
import NewsDetail from "./pages/NewsDetail";
import SettingsPage from "./pages/SettingsPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function RouteTracker() {
    const location = useLocation();

    useEffect(() => {
        const path = `${location.pathname}${location.search}`;
        if (path && path !== "/") {
            sessionStorage.setItem("lastPath", path);
        }
    }, [location]);

    return null;
}

export default function App() {
    return (
        <BrowserRouter>
            <RouteTracker />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                    path="/news"
                    element={
                        <ProtectedRoute>
                            <NewsList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/news/:id"
                    element={
                        <ProtectedRoute>
                            <NewsDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/portfolios"
                    element={
                        <ProtectedRoute>
                            <PortfolioDashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/portfolios/:id"
                    element={
                        <ProtectedRoute>
                            <PortfolioDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/portfolio"
                    element={
                        <ProtectedRoute>
                            <MarketPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/portfolio/:type/:code"
                    element={
                        <ProtectedRoute>
                            <InstrumentDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/analysis"
                    element={
                        <ProtectedRoute>
                            <AnalysisPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Navigate to="/settings/profile" replace />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings/:section"
                    element={
                        <ProtectedRoute>
                            <SettingsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Navigate to="/settings/profile" replace />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
