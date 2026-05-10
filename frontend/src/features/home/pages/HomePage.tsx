import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/auth/AuthContext";
import { useMarketSnapshot } from "../hooks/useMarketSnapshot";
import Navbar from "../components/Navbar";
import TickerBar from "../components/TickerBar";
import HeroSection from "../components/HeroSection";
import MarketOverview from "../components/MarketOverview";
import FeaturesSection from "../components/FeaturesSection";
import AnalysisSection from "../components/AnalysisSection";
import Footer from "../components/Footer";

export default function HomePage() {
    const { authenticated, ready } = useAuth();
    const navigate = useNavigate();
    const { snapshot, loading } = useMarketSnapshot();

    useEffect(() => {
        if (!ready) return;
        if (authenticated) {
            const lastPath = sessionStorage.getItem("lastPath");
            navigate(lastPath && lastPath !== "/" ? lastPath : "/portfolio", { replace: true });
        }
    }, [authenticated, ready, navigate]);

    if (ready && authenticated) return null;

    return (
        <>
            <Navbar />
            <TickerBar snapshot={snapshot} />
            <HeroSection snapshot={snapshot} loading={loading} />
            <MarketOverview snapshot={snapshot} loading={loading} />
            <FeaturesSection />
            <AnalysisSection />
            <Footer />
        </>
    );
}
