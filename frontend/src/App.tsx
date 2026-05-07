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
import { AdminGuard } from "./features/admin/AdminGuard";
import { AdminLayout } from "./features/admin/AdminLayout";
import { AdminDashboardPage } from "./features/admin/pages/AdminDashboardPage";
import { AdminCategoriesPage } from "./features/admin/pages/AdminCategoriesPage";
import { AdminMarketJobsPage } from "./features/admin/pages/AdminMarketJobsPage";
import { AdminNewsManagementPage } from "./features/admin/pages/AdminNewsManagementPage";
import { AdminNewsSourcesPage } from "./features/admin/pages/AdminNewsSourcesPage";
import { AdminUserDetailPage } from "./features/admin/pages/AdminUserDetailPage";
import { AdminUsersPage } from "./features/admin/pages/AdminUsersPage";
import { ForbiddenPage } from "./features/admin/pages/ForbiddenPage";

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
                <Route path="/forbidden" element={<ForbiddenPage />} />
                <Route element={<AdminGuard />}>
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboardPage />} />
                        <Route path="users" element={<AdminUsersPage />} />
                        <Route path="users/:id" element={<AdminUserDetailPage />} />
                        <Route path="news" element={<AdminNewsManagementPage />} />
                        <Route path="categories" element={<AdminCategoriesPage />} />
                        <Route path="news-sources" element={<AdminNewsSourcesPage />} />
                        <Route path="market-jobs" element={<AdminMarketJobsPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
