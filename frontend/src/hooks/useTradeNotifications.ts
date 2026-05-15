import { useEffect, useRef } from "react";
import {
    fetchPortfolioTradesSince,
    fetchTrade,
    type TradeResponse,
} from "../features/portfolio/api/portfolioApi";
import { useToast } from "../components/ToastContext";
import { websocketClient, type WebSocketEnvelope } from "../services/websocketClient";

type TradeSignalPayload = {
    transactionId?: number;
    portfolioId?: number;
    rejectionReason?: string;
};

type PortfolioSignalPayload = {
    portfolioId?: number;
};

type UseTradeNotificationsOptions = {
    token?: string;
    activePortfolioId: number | null;
    onPortfolioSignal: (portfolioId: number) => void;
    resolveTradeLabel?: (trade: TradeResponse) => string;
};

const transactionTypeText = (trade: TradeResponse) => (trade.transactionType === "BUY" ? "alışınız" : "satışınız");

function fallbackTradeLabel(trade: TradeResponse) {
    return trade.instrumentSymbol || `${trade.instrumentType} #${trade.instrumentId}`;
}

export function useTradeNotifications({
    token,
    activePortfolioId,
    onPortfolioSignal,
    resolveTradeLabel,
}: UseTradeNotificationsOptions) {
    const { showToast } = useToast();
    const lastSeenTimestampRef = useRef<string | null>(null);
    const activePortfolioIdRef = useRef(activePortfolioId);
    const onPortfolioSignalRef = useRef(onPortfolioSignal);
    const resolveTradeLabelRef = useRef(resolveTradeLabel);

    useEffect(() => {
        activePortfolioIdRef.current = activePortfolioId;
    }, [activePortfolioId]);

    useEffect(() => {
        onPortfolioSignalRef.current = onPortfolioSignal;
    }, [onPortfolioSignal]);

    useEffect(() => {
        resolveTradeLabelRef.current = resolveTradeLabel;
    }, [resolveTradeLabel]);

    useEffect(() => {
        if (!token) {
            websocketClient.disconnectIfIdle();
            return undefined;
        }

        websocketClient.connect(token);

        const unsubscribeTrades = websocketClient.subscribe<TradeSignalPayload>("/user/queue/trades", (envelope) => {
            lastSeenTimestampRef.current = envelope.timestamp;
            void handleTradeEnvelope(envelope);
        });

        const unsubscribePortfolio = websocketClient.subscribe<PortfolioSignalPayload>("/user/queue/portfolio", (envelope) => {
            lastSeenTimestampRef.current = envelope.timestamp;
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

        const onReconnect = (event: Event) => {
            const detail = (event as CustomEvent<{ reconnected?: boolean }>).detail;
            if (!detail?.reconnected) return;

            const portfolioId = activePortfolioIdRef.current;
            const since = lastSeenTimestampRef.current;
            if (!portfolioId || !since) return;

            fetchPortfolioTradesSince(portfolioId, since)
                .then((missedTrades) => {
                    if (missedTrades.length > 0) {
                        onPortfolioSignalRef.current(portfolioId);
                        showToast(`${missedTrades.length} işlem güncellemesi eşitlendi.`, "info");
                    }
                })
                .catch(() => {
                    showToast("Kaçırılan işlem güncellemeleri eşitlenemedi.", "error");
                });
        };

        window.addEventListener("portfolio-ws:connected", onReconnect);

        return () => {
            window.removeEventListener("portfolio-ws:connected", onReconnect);
            unsubscribeTrades();
            unsubscribePortfolio();
            unsubscribeFx();
            unsubscribeNews();
            websocketClient.disconnectIfIdle();
        };

        async function handleTradeEnvelope(envelope: WebSocketEnvelope<TradeSignalPayload>) {
            const portfolioId = envelope.data?.portfolioId;
            const tradeId = envelope.data?.transactionId;

            if (typeof portfolioId !== "number") return;
            onPortfolioSignalRef.current(portfolioId);

            if (typeof tradeId !== "number") {
                if (envelope.type === "TRADE_CANCELLED") {
                    showToast("İşlem iptal edildi.", "info");
                }
                return;
            }

            if (envelope.type === "TRADE_CANCELLED") {
                showToast("İşlem iptal edildi.", "info");
                return;
            }

            if (envelope.type === "TRADE_REJECTED") {
                const reason = envelope.data?.rejectionReason ?? "Sebep bilgisi alınamadı.";
                showToast(`İşlem reddedildi: ${reason}`, "error");
                return;
            }

            if (envelope.type !== "TRADE_APPROVED") return;

            try {
                const trade = await fetchTrade(portfolioId, tradeId);
                const label = resolveTradeLabelRef.current?.(trade) || fallbackTradeLabel(trade);
                showToast(`${label} ${transactionTypeText(trade)} onaylandı.`, "success");
            } catch {
                showToast(`İşlem #${tradeId} onaylandı.`, "success");
            }
        }
    }, [showToast, token]);
}
