import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_BASE } from "../api/market";

export type WebSocketEventType =
    | "TRADE_APPROVED"
    | "TRADE_REJECTED"
    | "TRADE_CANCELLED"
    | "PORTFOLIO_UPDATED"
    | "USER_BALANCE_UPDATED"
    | "STOCK_PRICES_UPDATED"
    | "FX_RATES_UPDATED"
    | "NEWS_PUBLISHED";

export type WebSocketEnvelope<T = unknown> = {
    type: WebSocketEventType;
    data: T;
    timestamp: string;
};

type EnvelopeHandler<T> = (message: WebSocketEnvelope<T>) => void;
type PendingSubscription = {
    destination: string;
    handler: EnvelopeHandler<unknown>;
    active?: StompSubscription;
};

type ConnectionEventDetail = {
    reconnected: boolean;
};

function emitToast(message: string, tone: "success" | "error" | "info" = "info") {
    window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, tone } }));
}

function emitConnected(reconnected: boolean) {
    window.dispatchEvent(
        new CustomEvent<ConnectionEventDetail>("portfolio-ws:connected", {
            detail: { reconnected },
        }),
    );
}

function resolveWsUrl() {
    if (!API_BASE) return "/ws";
    return `${API_BASE.replace(/\/$/, "")}/ws`;
}

class PortfolioWebSocketClient {
    private client: Client | null = null;
    private token: string | null = null;
    private connectedOnce = false;
    private reconnecting = false;
    private subscriptions = new Set<PendingSubscription>();

    connect(token: string) {
        if (!token) return;

        if (this.client?.active && this.token === token) {
            return;
        }

        this.disconnect(false);
        this.token = token;

        const client = new Client({
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            webSocketFactory: () => new SockJS(resolveWsUrl()) as unknown as WebSocket,
            onConnect: () => {
                const reconnected = this.connectedOnce;
                this.connectedOnce = true;
                this.reconnecting = false;
                this.resubscribeAll();

                if (reconnected) {
                    emitToast("Bağlantı yeniden kuruldu", "success");
                }
                emitConnected(reconnected);
            },
            onWebSocketClose: () => {
                if (!this.connectedOnce || this.reconnecting) return;
                this.reconnecting = true;
                emitToast("Bağlantı kesildi, yeniden bağlanılıyor...", "info");
            },
            onStompError: () => {
                emitToast("WebSocket oturumu doğrulanamadı.", "error");
            },
        });

        this.client = client;
        client.activate();
    }

    disconnect(clearSubscriptions = true) {
        this.subscriptions.forEach((subscription) => {
            subscription.active?.unsubscribe();
            subscription.active = undefined;
        });

        if (clearSubscriptions) {
            this.subscriptions.clear();
        }

        this.client?.deactivate();
        this.client = null;
        this.token = null;
        this.connectedOnce = false;
        this.reconnecting = false;
    }

    disconnectIfIdle() {
        if (this.subscriptions.size === 0) {
            this.disconnect(false);
        }
    }

    subscribe<T>(destination: string, handler: EnvelopeHandler<T>) {
        const pending: PendingSubscription = {
            destination,
            handler: handler as EnvelopeHandler<unknown>,
        };

        this.subscriptions.add(pending);
        this.activateSubscription(pending);

        return () => {
            pending.active?.unsubscribe();
            this.subscriptions.delete(pending);
        };
    }

    private resubscribeAll() {
        this.subscriptions.forEach((subscription) => {
            subscription.active?.unsubscribe();
            subscription.active = undefined;
            this.activateSubscription(subscription);
        });
    }

    private activateSubscription(subscription: PendingSubscription) {
        if (!this.client?.connected) return;

        subscription.active = this.client.subscribe(subscription.destination, (message: IMessage) => {
            try {
                const envelope = JSON.parse(message.body) as WebSocketEnvelope<unknown>;
                subscription.handler(envelope);
            } catch {
                emitToast("WebSocket mesajı okunamadı.", "error");
            }
        });
    }
}

export const websocketClient = new PortfolioWebSocketClient();
