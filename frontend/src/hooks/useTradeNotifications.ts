import { useEffect, useRef } from "react";
import { useToast } from "../components/ToastContext";
import { MARKET_UPDATE_TOPICS, websocketClient } from "../services/websocketClient";

type PortfolioSignalPayload = {
    portfolioId?: number;
};

type UseTradeNotificationsOptions = {
    token?: string;
    activePortfolioId: number | null;
    onPortfolioSignal: (portfolioId: number) => void;
    onMarketSignal?: () => void;
    onBalanceSignal?: () => void;
};

export function useTradeNotifications({
    token,
    activePortfolioId,
    onPortfolioSignal,
    onMarketSignal,
}: UseTradeNotificationsOptions) {
    const { showToast } = useToast();
    const activePortfolioIdRef = useRef(activePortfolioId);
    const onPortfolioSignalRef = useRef(onPortfolioSignal);
    const onMarketSignalRef = useRef(onMarketSignal);

    useEffect(() => {
        activePortfolioIdRef.current = activePortfolioId;
    }, [activePortfolioId]);

    useEffect(() => {
        onPortfolioSignalRef.current = onPortfolioSignal;
    }, [onPortfolioSignal]);

    useEffect(() => {
        onMarketSignalRef.current = onMarketSignal;
    }, [onMarketSignal]);

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

        const unsubscribeMarket = MARKET_UPDATE_TOPICS.map((topic) => websocketClient.subscribe(topic, () => {
            onMarketSignalRef.current?.();
            const portfolioId = activePortfolioIdRef.current;
            if (portfolioId) {
                onPortfolioSignalRef.current(portfolioId);
            }
        }));
        const unsubscribeNews = websocketClient.subscribe("/topic/news", () => undefined);

        return () => {
            unsubscribePortfolio();
            unsubscribeMarket.forEach((unsubscribe) => unsubscribe());
            unsubscribeNews();
            websocketClient.disconnectIfIdle();
        };
    }, [showToast, token]);
}
