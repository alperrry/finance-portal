import { Avatar, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/auth/AuthContext";
import { LiveBadge } from "./components/LiveBadge";
import { NotificationBell } from "./components/NotificationBell";
import { useAdminQueryInvalidation } from "./api/useAdminQueryInvalidation";
import { useAdminWebSocket } from "./websocket/useAdminWebSocket";
import { useAuditFeed } from "./websocket/useAuditFeed";

const NAV_LINK_SX = {
    display: "block",
    color: "text.secondary",
    textDecoration: "none",
    px: 1.625,
    py: 1.375,
    borderRadius: "14px",
    fontSize: 13,
    fontWeight: 700,
    transition: "color 0.18s, background 0.18s",
    "&.active, &:hover": {
        color: "text.primary",
        bgcolor: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 17, 17, 0.07)",
    },
};

export function AdminLayout() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const auditFeed = useAuditFeed();
    const detailMatch = location.pathname.match(/^\/admin\/users\/(\d+)/);
    const watchedUserId = detailMatch ? Number(detailMatch[1]) : null;
    const { state } = useAdminWebSocket({ onEvent: auditFeed.addEvent, watchedUserId });
    useAdminQueryInvalidation();

    const NAV_ITEMS = [
        { to: "/admin", label: t("admin.nav.dashboard"), end: true },
        { to: "/admin/users", label: t("admin.nav.users"), end: false },
        { to: "/admin/news", label: t("admin.nav.newsManagement"), end: false },
        { to: "/admin/categories", label: t("admin.nav.categoryManagement"), end: false },
        { to: "/admin/news-sources", label: t("admin.nav.rssSources"), end: false },
        { to: "/admin/market-jobs", label: t("admin.nav.marketJobs"), end: false },
    ];

    const titleForPath = (pathname: string) => {
        if (pathname.includes("/admin/users/")) return t("admin.nav.userDetail");
        if (pathname.includes("/admin/users")) return t("admin.nav.users");
        if (pathname.includes("/admin/news-sources")) return t("admin.nav.rssSources");
        if (pathname.includes("/admin/news")) return t("admin.nav.newsManagement");
        if (pathname.includes("/admin/categories")) return t("admin.nav.categoryManagement");
        if (pathname.includes("/admin/market-jobs")) return t("admin.nav.marketJobs");
        return t("admin.nav.dashboard");
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: (theme) => theme.palette.mode === "dark" ? "radial-gradient(circle at 14% -12%, rgba(193, 98, 47, 0.1), transparent 42%), #181512" : "radial-gradient(circle at 14% -12%, rgba(193, 98, 47, 0.1), transparent 42%), #edeae4",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "248px minmax(0, 1fr)" },
                fontFamily: '"Sora", sans-serif',
            }}
        >
            <Box
                component="aside"
                sx={{
                    borderRight: "1px solid",
                    borderColor: "divider",
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(24, 21, 18, 0.86)" : "rgba(247, 245, 241, 0.86)",
                    backdropFilter: "blur(20px)",
                    p: "22px 18px",
                }}
            >
                <Button
                    type="button"
                    color="inherit"
                    startIcon={<Box component="span" sx={{ color: "secondary.main", fontSize: 20 }}>◈</Box>}
                    sx={{ mb: 3.75, p: 0, textTransform: "none" }}
                    onClick={() => undefined}
                >
                    <Typography sx={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 13, fontWeight: 800 }}>
                        {t("admin.header.brand")}
                    </Typography>
                </Button>

                <Box component="nav" aria-label={t("admin.nav.adminMenu")} sx={{ display: "grid", gap: 1 }}>
                    {NAV_ITEMS.map((item) => (
                        <Box
                            key={item.to}
                            component={NavLink}
                            to={item.to}
                            end={item.end}
                            sx={NAV_LINK_SX}
                        >
                            {item.label}
                        </Box>
                    ))}
                </Box>
            </Box>

            <Box sx={{ minWidth: 0 }}>
                <Box
                    component="header"
                    sx={{
                        height: { xs: "auto", md: 82 },
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(24, 21, 18, 0.8)" : "rgba(237, 234, 228, 0.8)",
                        backdropFilter: "blur(18px)",
                        display: "flex",
                        alignItems: { xs: "flex-start", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        justifyContent: "space-between",
                        px: 3.75,
                        py: { xs: 2, md: 0 },
                        gap: { xs: 2, md: 0 },
                        position: "sticky",
                        top: 0,
                        zIndex: 20,
                    }}
                >
                    <Box>
                        <Typography sx={{ color: "text.secondary", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {t("admin.header.adminPanel")}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                            {titleForPath(location.pathname)}
                        </Typography>
                    </Box>

                    <Stack direction="row" sx={{ alignItems: "center", gap: 1.25 }}>
                        <LiveBadge state={state} />
                        <NotificationBell events={auditFeed.events} unreadCount={auditFeed.unreadCount} onOpen={auditFeed.markAllRead} />
                        <Button
                            variant="outlined"
                            color="inherit"
                            size="small"
                            type="button"
                            onClick={() => navigate("/portfolio")}
                        >
                            {t("admin.nav.backToSite")}
                        </Button>
                        <Chip
                            avatar={<Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 11, fontWeight: 800 }}>
                                {(currentUser?.firstName || currentUser?.username || "A").slice(0, 2).toLocaleUpperCase("tr-TR")}
                            </Avatar>}
                            label={currentUser?.username ?? "Admin"}
                            onClick={logout}
                            sx={{ cursor: "pointer", border: "1px solid", borderColor: "divider", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.76)" : "rgba(255, 255, 255, 0.76)", fontWeight: 800 }}
                        />
                    </Stack>
                </Box>

                <Box component="main" sx={{ p: "28px 30px 44px" }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
