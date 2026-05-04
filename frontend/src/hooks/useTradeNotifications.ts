import { useEffect, useRef } from "react";
import {
    fetchPortfolioTradesSince,
    fetchTrade,
    type TradeResponse,
} from "../api/portfolio";
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
    onBalanceSignal?: () => void | Promise<unknown>;
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
    onBalanceSignal,
    resolveTradeLabel,
}: UseTradeNotificationsOptions) {
    const { showToast } = useToast();
    const lastSeenTimestampRef = useRef<string | null>(null);
    const activePortfolioIdRef = useRef(activePortfolioId);
    const onPortfolioSignalRef = useRef(onPortfolioSignal);
    const onBalanceSignalRef = useRef(onBalanceSignal);
    const resolveTradeLabelRef = useRef(resolveTradeLabel);

    useEffect(() => {
        activePortfolioIdRef.current = activePortfolioId;
    }, [activePortfolioId]);

    useEffect(() => {
        onPortfolioSignalRef.current = onPortfolioSignal;
    }, [onPortfolioSignal]);

    useEffect(() => {
        onBalanceSignalRef.current = onBalanceSignal;
    }, [onBalanceSignal]);

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

        const unsubscribeBalance = websocketClient.subscribe("/user/queue/balance", (envelope) => {
            lastSeenTimestampRef.current = envelope.timestamp;
            if (envelope.type === "USER_BALANCE_UPDATED") {
                void onBalanceSignalRef.current?.();
            }
        });

        const unsubscribeStocks = websocketClient.subscribe("/topic/market/stocks/prices", () => undefined);
        const unsubscribeFx = websocketClient.subscribe("/topic/market/fx/rates", () => undefined);
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
            unsubscribeBalance();
            unsubscribeStocks();
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
