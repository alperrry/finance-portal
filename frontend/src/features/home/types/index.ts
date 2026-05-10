export type MarketDirection = "up" | "down" | "neutral";

export interface MarketItem {
    key: string;
    instrumentType: "fx" | "stock";
    symbol: string;
    name: string;
    marketLabel: string;
    currency: string | null;
    price: number | null;
    changePercent: number | null;
    direction: MarketDirection;
    dataDate: string | null;
    fetchedAt: string | null;
}

export interface MarketSnapshot {
    heroItems: MarketItem[];
    marketItems: MarketItem[];
    generatedAt: string;
}