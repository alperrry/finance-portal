import { useEffect, useRef } from "react";
import { useToast } from "../components/ToastContext";
import { websocketClient } from "../services/websocketClient";

type PortfolioSignalPayload = {
    portfolioId?: number;
};

type UseTradeNotificationsOptions = {
    token?: string;
    activePortfolioId: number | null;
    onPortfolioSignal: (portfolioId: number) => void;
};

export function useTradeNotifications({
    token,
    activePortfolioId,
    onPortfolioSignal,
}: UseTradeNotificationsOptions) {
    const { showToast } = useToast();
    const activePortfolioIdRef = useRef(activePortfolioId);
    const onPortfolioSignalRef = useRef(onPortfolioSignal);

    useEffect(() => {
        activePortfolioIdRef.current = activePortfolioId;
    }, [activePortfolioId]);

    useEffect(() => {
        onPortfolioSignalRef.current = onPortfolioSignal;
    }, [onPortfolioSignal]);

    useEffect(() => {
        if (!token) {
            websocketClient.disconnectIfIdle();
            return undefined;
        }

        websocketClient.connect(token);

        const unsubscribePortfolio = websocketClient.subscribe<PortfolioSignalPayload>("/user/queue/portfolio", (envelope) => {
            const portfolioId = envelope.data?.portfolioId;
            if (typeof portfolioId === "number") {
                onPortfolioSignalRef.current(portfolioId);
            }
        });

        const unsubscribeFx = websocketClient.subscribe("/topic/market/fx/rates", () => {
            const portfolioId = activePortfolioIdRef.current;
            if (portfolioId) {
                onPortfolioSignalRef.current(portfolioId);
            }
        });
        const unsubscribeNews = websocketClient.subscribe("/topic/news", () => undefined);

        return () => {
            unsubscribePortfolio();
            unsubscribeFx();
            unsubscribeNews();
            websocketClient.disconnectIfIdle();
        };
    }, [showToast, token]);
}
