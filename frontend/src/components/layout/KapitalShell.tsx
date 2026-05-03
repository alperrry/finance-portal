import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCategories, type NewsCategory } from "../../api/news";
import { useAuth } from "../../auth/AuthContext";
import KapitalTicker from "./KapitalTicker";

type ActivePage = "portfolio" | "news" | "analysis" | "tools" | "profile" | "settings";

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
        <div className={`kp-shell ${showCategories ? "" : "kp-shell-no-categories"}`.trim()}>
            <KapitalTicker />

            <header className="kp-navbar" role="banner">
                <div className="kp-navbar-top">
                    <button className="kp-logo" type="button" onClick={() => navigate("/portfolio")}
                    >
                        <span className="kp-logo-sym">◈</span>
                        <span className="kp-logo-text">Kapital</span>
                    </button>

                    <nav className="kp-nav-links" aria-label="Ana menü">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                className={`kp-nav-btn ${activePage === item.id ? "active" : ""}`.trim()}
                                type="button"
                                onClick={() => navigate(item.to)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="kp-nav-right">
                        <span className="kp-nav-chip">{navDate}</span>
                        <span className="kp-nav-chip">{navTime}</span>
                        <button
                            className={`kp-nav-user ${activePage === "profile" || activePage === "settings" ? "active" : ""}`.trim()}
                            type="button"
                            onClick={() => navigate("/settings/profile")}
                            aria-label="Ayarlar"
                        >
                            <span className="kp-nav-avatar" aria-hidden="true">{userInitials}</span>
                            <span className="kp-nav-user-copy">
                                <span className="kp-nav-user-name">Merhaba, {userGreetingName}</span>
                                <span className="kp-nav-user-meta">
                                    <span>Ayarlar</span>
                                    {currentUser?.role === "ADMIN" ? <span className="kp-role-badge admin">Admin</span> : null}
                                </span>
                            </span>
                        </button>
                        <button className="kp-nav-action" type="button" onClick={logout}>Çıkış</button>
                    </div>
                </div>

                {showCategories ? (
                    <div className="kp-category-row" aria-label="Haber kategorileri">
                        <button
                            className={`kp-category-pill ${selectedCategoryId === "" ? "active" : ""}`.trim()}
                            type="button"
                            onClick={() => openCategory()}
                        >
                            Tum kategoriler
                        </button>

                        {loadingCategories ? (
                            <span className="kp-category-loading">Kategoriler yukleniyor...</span>
                        ) : (
                            categories.map((category) => {
                                const currentId = String(category.id);
                                return (
                                    <button
                                        key={category.id}
                                        className={`kp-category-pill ${selectedCategoryId === currentId ? "active" : ""}`.trim()}
                                        type="button"
                                        onClick={() => openCategory(currentId)}
                                    >
                                        {category.name}
                                    </button>
                                );
                            })
                        )}
                    </div>
                ) : null}
            </header>

            <main className="kp-shell-main">{children}</main>
        </div>
    );
}
