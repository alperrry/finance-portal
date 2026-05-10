import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import HomePage from "../features/home/pages/HomePage";
import SettingsPage from "../features/settings/pages/SettingsPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminGuard } from "../features/admin/AdminGuard";
import { AdminLayout } from "../features/admin/AdminLayout";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminCategoriesPage } from "../features/admin/pages/AdminCategoriesPage";
import { AdminMarketJobsPage } from "../features/admin/pages/AdminMarketJobsPage";
import { AdminNewsManagementPage } from "../features/admin/pages/AdminNewsManagementPage";
import { AdminNewsSourcesPage } from "../features/admin/pages/AdminNewsSourcesPage";
import { AdminUserDetailPage } from "../features/admin/pages/AdminUserDetailPage";
import { AdminUsersPage } from "../features/admin/pages/AdminUsersPage";
import { ForbiddenPage } from "../features/admin/pages/ForbiddenPage";

const MarketPage = lazy(() => import("../features/market/pages/MarketPage"));
const PortfolioDashboardPage = lazy(() => import("../features/portfolio/pages/PortfolioDashboardPage"));
const PortfolioDetailPage = lazy(() => import("../features/portfolio/pages/PortfolioDetailPage"));
const InstrumentDetailPage = lazy(() => import("../features/market/pages/InstrumentDetailPage"));
const AnalysisPage = lazy(() => import("../features/analysis/pages/AnalysisPage"));
const NewsList = lazy(() => import("../features/news/pages/NewsListPage"));
const NewsDetail = lazy(() => import("../features/news/pages/NewsDetailPage"));

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

function RouteFallback() {
    return (
        <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
            <CircularProgress size={28} />
        </Box>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <RouteTracker />
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
        </BrowserRouter>
    );
}
