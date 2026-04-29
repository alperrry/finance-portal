import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchLandingMarketSnapshot, type LandingMarketSnapshotResponse } from "../api/landing";
import { useAuth } from "../auth/AuthContext";
import { renderPortalMarketSnapshot } from "./homePagePortalMarket";
import portalHtmlTemplate from "../../finans-portal.html?raw";

const PORTAL_AUTH_EVENT = "kapital-auth";
const PORTAL_TARGET_PORTFOLIO_PATH = "/portfolio";
const EMPTY_MARKET_SNAPSHOT: LandingMarketSnapshotResponse = {
    heroItems: [],
    marketItems: [],
    generatedAt: "",
};

type KapitalAction = "login" | "register" | "open-portfolio";

type KapitalIframeEvent = {
    type?: string;
    action?: string;
};

type PortalReplacement = {
    pattern: string | RegExp;
    replacement: string;
};

const PORTAL_AUTH_STYLE = `
.btn-nav.btn-nav-ghost {
  background: #C1622F;
  color: #fff;
  box-shadow: 0 8px 24px rgba(193,98,47,0.35);
}
.btn-nav.btn-nav-ghost:hover { background: #d4703a; }
`;

const PORTAL_AUTH_NAV = `<div class="nav-right">
    <button class="btn-nav btn-nav-ghost" data-kapital-action="login">Sign in</button>
    <button class="btn-nav" data-kapital-action="register">Hemen Başla</button>
  </div>
</nav>`;

const ACTION_BRIDGE_SCRIPT = `
<script>
(function () {
  const postAction = function (action) {
    try {
      window.parent.postMessage({ type: "${PORTAL_AUTH_EVENT}", action: action }, "*");
    } catch (error) {
      // ignore
    }
  };

  const scrollToSection = function (sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  document.addEventListener("click", function (event) {
    const scrollTrigger = event.target.closest("[data-kapital-scroll]");
    if (scrollTrigger) {
      event.preventDefault();
      scrollToSection(scrollTrigger.getAttribute("data-kapital-scroll") || "");
      return;
    }

    const trigger = event.target.closest("[data-kapital-action]");
    if (!trigger) return;
    event.preventDefault();
    postAction(trigger.getAttribute("data-kapital-action") || "");
  });
})();
</script>
`;

const PORTAL_REPLACEMENTS: PortalReplacement[] = [
    {
        pattern: '<nav class="navbar" id="nb">',
        replacement: '<nav class="navbar dark-nav" id="nb">',
    },
    {
        pattern: /<!-- ══ TICKER BAR ══ -->[\s\S]*?<!-- ══ NAVBAR ══ -->/,
        replacement: "<!-- ══ NAVBAR ══ -->",
    },
    {
        pattern: /<ul class="nav-links">[\s\S]*?<\/ul>/,
        replacement: "",
    },
    {
        pattern: /<div class="nav-right">[\s\S]*?<\/div>\s*<\/nav>/,
        replacement: PORTAL_AUTH_NAV,
    },
    {
        pattern: "</style>",
        replacement: `${PORTAL_AUTH_STYLE}</style>`,
    },
    {
        pattern: /<button class="btn-nav">Hemen Başla<\/button>/,
        replacement: '<button class="btn-nav" data-kapital-action="login">Hemen Başla</button>',
    },
    {
        pattern: /<a href="#" class="btn-hero-primary">Hemen Başlayın <span class="btn-arrow">→<\/span><\/a>/,
        replacement:
            '<button type="button" class="btn-hero-primary" data-kapital-action="register">Hemen Başlayın <span class="btn-arrow">→</span></button>',
    },
    {
        pattern: /<a href="#market" class="btn-hero-secondary">Canlı Piyasaları Gör <span class="btn-arrow">↓<\/span><\/a>/,
        replacement:
            '<button type="button" class="btn-hero-secondary" data-kapital-scroll="market">Canlı Piyasaları Gör <span class="btn-arrow">↓</span></button>',
    },
    {
        pattern: /<a href="#" class="sec-link">Tüm piyasalar →<\/a>/,
        replacement: '<button type="button" class="sec-link" data-kapital-action="open-portfolio">Tüm piyasalar →</button>',
    },
];

function buildPortalHtml(template: string) {
    const htmlWithActions = PORTAL_REPLACEMENTS.reduce(
        (html, { pattern, replacement }) => html.replace(pattern, replacement),
        template,
    );

    return htmlWithActions.replace("</body>", `${ACTION_BRIDGE_SCRIPT}</body>`);
}

function isKapitalAction(action: string | undefined): action is KapitalAction {
    return action === "login" || action === "register" || action === "open-portfolio";
}

const PORTAL_FRAME_HTML = buildPortalHtml(portalHtmlTemplate);

export default function HomePagePortal() {
    const { ready, authenticated, login, register } = useAuth();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeReady, setIframeReady] = useState(false);
    const [marketSnapshot, setMarketSnapshot] = useState<LandingMarketSnapshotResponse | null>(null);

    const redirectTarget = (() => {
        const lastPath = sessionStorage.getItem("lastPath");
        if (!lastPath || lastPath === "/") return PORTAL_TARGET_PORTFOLIO_PATH;
        if (lastPath.startsWith("/#")) return PORTAL_TARGET_PORTFOLIO_PATH;
        if (lastPath.includes("session_state=") || lastPath.includes("iss=")) {
            return PORTAL_TARGET_PORTFOLIO_PATH;
        }

        return lastPath;
    })();

    useEffect(() => {
        const openPortfolio = () => {
            sessionStorage.setItem("lastPath", PORTAL_TARGET_PORTFOLIO_PATH);
            login();
        };

        const onMessage = (event: MessageEvent<KapitalIframeEvent>) => {
            if (event.source !== iframeRef.current?.contentWindow) return;
            if (event.data?.type !== PORTAL_AUTH_EVENT) return;
            if (!isKapitalAction(event.data.action)) return;

            if (event.data.action === "login") {
                login();
                return;
            }

            if (event.data.action === "register") {
                register();
                return;
            }

            if (event.data.action === "open-portfolio") {
                openPortfolio();
            }
        };

        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [login, register]);

    useEffect(() => {
        if (!ready || authenticated) {
            return;
        }

        let active = true;

        const loadMarketSnapshot = async () => {
            try {
                const snapshot = await fetchLandingMarketSnapshot();
                if (!active) return;

                setMarketSnapshot(snapshot);
            } catch {
                if (!active) return;
                setMarketSnapshot(EMPTY_MARKET_SNAPSHOT);
            }
        };

        void loadMarketSnapshot();

        const intervalId = window.setInterval(() => {
            void loadMarketSnapshot();
        }, 300_000);

        return () => {
            active = false;
            window.clearInterval(intervalId);
        };
    }, [ready, authenticated]);

    useEffect(() => {
        const frameDocument = iframeRef.current?.contentDocument;
        if (!iframeReady || !frameDocument || !marketSnapshot) {
            return;
        }

        renderPortalMarketSnapshot(frameDocument, marketSnapshot);
    }, [iframeReady, marketSnapshot]);

    if (ready && authenticated) {
        return <Navigate to={redirectTarget} replace />;
    }

    if (!ready) {
        return (
            <div className="kp-loading">
                <div className="kp-loading-card">
                    <div className="kp-loading-title">Kapital yükleniyor</div>
                    <div className="kp-loading-sub">
                        Kimlik doğrulama kontrol ediliyor...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <iframe
            ref={iframeRef}
            title="Kapital Homepage"
            srcDoc={PORTAL_FRAME_HTML}
            onLoad={() => setIframeReady(true)}
            style={{
                display: "block",
                width: "100%",
                minHeight: "100vh",
                height: "100vh",
                border: "none",
                background: "#edeae4",
            }}
        />
    );
}
