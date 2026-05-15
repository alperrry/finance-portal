import { useEffect, useMemo, useState } from "react";
import { AppBar, Avatar, Box, Button, Chip, Stack, Toolbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fetchCategories, type NewsCategory } from "../../features/news/api/newsApi";
import { useAuth } from "../../app/auth/AuthContext";
import KapitalTicker from "./KapitalTicker";

type ActivePage = "portfolio" | "portfolios" | "news" | "analysis" | "tools" | "profile" | "settings";

type KapitalShellProps = {
    activePage: ActivePage;
    children: React.ReactNode;
    selectedCategoryId?: string;
    showCategories?: boolean;
};

const formatDate = (value: Date) =>
    new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);

const formatTime = (value: Date) =>
    new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);

const navItems: Array<{ id: ActivePage; label: string; to: string }> = [
    { id: "portfolio", label: "Piyasalar", to: "/portfolio" },
    { id: "portfolios", label: "Portföyüm", to: "/portfolios" },
    { id: "news", label: "Haberler", to: "/news" },
    { id: "analysis", label: "Analiz", to: "/analysis" },
    { id: "tools", label: "Araclar", to: "/portfolio" },
];

export default function KapitalShell({
    activePage,
    children,
    selectedCategoryId = "",
    showCategories = true,
}: KapitalShellProps) {
    const navigate = useNavigate();
    const { logout, currentUser } = useAuth();

    const [categories, setCategories] = useState<NewsCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(showCategories);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let active = true;

        const loadCategories = async () => {
            if (!showCategories) {
                setCategories([]);
                setLoadingCategories(false);
                return;
            }

            setLoadingCategories(true);

            try {
                const items = await fetchCategories(true);
                if (!active) return;
                setCategories(items);
                setLoadingCategories(false);
            } catch {
                if (!active) return;
                setCategories([]);
                setLoadingCategories(false);
            }
        };

        void loadCategories();

        return () => {
            active = false;
        };
    }, [showCategories]);

    const navDate = useMemo(() => formatDate(now), [now]);
    const navTime = useMemo(() => formatTime(now), [now]);
    const userDisplayName = useMemo(() => {
        const fullName = [currentUser?.firstName, currentUser?.lastName]
            .map((value) => value?.trim())
            .filter(Boolean)
            .join(" ");

        return fullName || currentUser?.username || currentUser?.email || "Kullanıcı";
    }, [currentUser]);
    const userGreetingName = currentUser?.firstName?.trim() || userDisplayName;
    const userInitials = useMemo(() => {
        const parts = userDisplayName.split(" ").filter(Boolean);
        const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : userDisplayName.slice(0, 2);
        return initials.toLocaleUpperCase("tr-TR");
    }, [userDisplayName]);

    const openCategory = (categoryId?: string) => {
        if (categoryId && categoryId.length > 0) {
            navigate(`/news?category=${categoryId}`);
            return;
        }

        navigate("/news");
    };

    return (
        <Box sx={{ minHeight: "100vh", background: "radial-gradient(circle at 15% -10%, rgba(193, 98, 47, 0.09), transparent 40%), #edeae4" }}>
            <KapitalTicker />

            <AppBar
                position="sticky"
                color="inherit"
                elevation={0}
                component="header"
                role="banner"
                sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "rgba(255, 255, 255, 0.94)",
                    backdropFilter: "blur(18px)",
                    zIndex: (theme) => theme.zIndex.appBar,
                }}
            >
                <Toolbar
                    disableGutters
                    sx={{
                        minHeight: "auto",
                        px: { xs: 2, lg: 4 },
                        py: 1.5,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "auto 1fr auto" },
                        alignItems: "center",
                        gap: 2,
                    }}
                >
                    <Button
                        color="inherit"
                        type="button"
                        onClick={() => navigate("/portfolio")}
                        startIcon={<Box component="span" sx={{ color: "secondary.main" }}>◈</Box>}
                        sx={{ justifySelf: "start", fontSize: 20, fontWeight: 900 }}
                    >
                        Kapital
                    </Button>

                    <Stack
                        component="nav"
                        direction="row"
                        aria-label="Ana menü"
                        sx={{
                            gap: 1,
                            flexWrap: "wrap",
                            justifyContent: { xs: "flex-start", lg: "center" },
                        }}
                    >
                        {navItems.map((item) => (
                            <Button
                                key={item.id}
                                variant={activePage === item.id ? "contained" : "text"}
                                color={activePage === item.id ? "primary" : "inherit"}
                                type="button"
                                onClick={() => navigate(item.to)}
                                size="small"
                            >
                                {item.label}
                            </Button>
                        ))}
                    </Stack>

                    <Stack
                        direction="row"
                        sx={{
                            gap: 1,
                            flexWrap: "wrap",
                            justifyContent: { xs: "flex-start", lg: "flex-end" },
                            alignItems: "center",
                        }}
                    >
                        <Chip size="small" label={navDate} variant="outlined" />
                        <Chip size="small" label={navTime} variant="outlined" />
                        {currentUser?.role === "ADMIN" ? (
                            <Button
                                variant="outlined"
                                color="secondary"
                                size="small"
                                type="button"
                                onClick={() => navigate("/admin/users")}
                            >
                                Admin Paneli
                            </Button>
                        ) : null}
                        <Button
                            variant={activePage === "profile" || activePage === "settings" ? "contained" : "outlined"}
                            color="inherit"
                            type="button"
                            onClick={() => navigate("/settings/profile")}
                            aria-label="Ayarlar"
                            startIcon={<Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{userInitials}</Avatar>}
                            sx={{ maxWidth: { xs: "100%", sm: 260 }, justifyContent: "flex-start" }}
                        >
                            <Stack sx={{ alignItems: "flex-start", gap: 0, minWidth: 0 }}>
                                <Typography variant="caption" noWrap sx={{ fontWeight: 800 }}>
                                    Merhaba, {userGreetingName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    Ayarlar{currentUser?.role === "ADMIN" ? " · Admin" : ""}
                                </Typography>
                            </Stack>
                        </Button>
                        <Button variant="contained" size="small" type="button" onClick={logout}>Çıkış</Button>
                    </Stack>
                </Toolbar>

                {showCategories ? (
                    <Stack
                        direction="row"
                        aria-label="Haber kategorileri"
                        sx={{ gap: 1, px: { xs: 2, lg: 4 }, pb: 1.5, overflow: "auto" }}
                    >
                        <Button
                            variant={selectedCategoryId === "" ? "contained" : "outlined"}
                            color={selectedCategoryId === "" ? "primary" : "inherit"}
                            size="small"
                            type="button"
                            onClick={() => openCategory()}
                            sx={{ flex: "0 0 auto" }}
                        >
                            Tüm kategoriler
                        </Button>

                        {loadingCategories ? (
                            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
                                Kategoriler yükleniyor...
                            </Typography>
                        ) : (
                            categories.map((category) => {
                                const currentId = String(category.id);
                                return (
                                    <Button
                                        key={category.id}
                                        variant={selectedCategoryId === currentId ? "contained" : "outlined"}
                                        color={selectedCategoryId === currentId ? "primary" : "inherit"}
                                        size="small"
                                        type="button"
                                        onClick={() => openCategory(currentId)}
                                        sx={{ flex: "0 0 auto" }}
                                    >
                                        {category.name}
                                    </Button>
                                );
                            })
                        )}
                    </Stack>
                ) : null}
            </AppBar>

            <Box component="main" sx={{ pb: "44px" }}>{children}</Box>
        </Box>
    );
}
