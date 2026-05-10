import { Box, Typography } from "@mui/material";
import type { MarketItem, MarketSnapshot } from "../types";

type Props = {
    snapshot: MarketSnapshot | null;
};

function formatPrice(price: number | null): string {
    if (price === null) return "—";
    return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatChange(changePercent: number | null): string {
    if (changePercent === null) return "";
    const sign = changePercent >= 0 ? "▲" : "▼";
    return `${sign} ${Math.abs(changePercent).toFixed(2)}%`;
}

function TickerItem({ item }: { item: MarketItem }) {
    const changeColor =
        item.direction === "up" ? "#2f8f58" : item.direction === "down" ? "#c84b4b" : "#999";

    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 3,
                borderRight: "1px solid #333",
                whiteSpace: "nowrap",
            }}
        >
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#ccc" }}>
                {item.symbol}
            </Typography>
            <Typography variant="caption" sx={{ color: "#fff" }}>
                {formatPrice(item.price)}
            </Typography>
            {item.changePercent !== null && (
                <Typography variant="caption" sx={{ color: changeColor }}>
                    {formatChange(item.changePercent)}
                </Typography>
            )}
        </Box>
    );
}

const FALLBACK_ITEMS: MarketItem[] = [
    { key: "USD", instrumentType: "fx", symbol: "USD/TRY", name: "Dolar", marketLabel: "TCMB", currency: "TRY", price: null, changePercent: null, direction: "neutral", dataDate: null, fetchedAt: null },
    { key: "EUR", instrumentType: "fx", symbol: "EUR/TRY", name: "Euro", marketLabel: "TCMB", currency: "TRY", price: null, changePercent: null, direction: "neutral", dataDate: null, fetchedAt: null },
    { key: "GBP", instrumentType: "fx", symbol: "GBP/TRY", name: "Sterlin", marketLabel: "TCMB", currency: "TRY", price: null, changePercent: null, direction: "neutral", dataDate: null, fetchedAt: null },
    { key: "BIST", instrumentType: "stock", symbol: "BIST 100", name: "BIST", marketLabel: "Borsa İstanbul", currency: "TRY", price: null, changePercent: null, direction: "neutral", dataDate: null, fetchedAt: null },
];

export default function TickerBar({ snapshot }: Props) {
    const items = snapshot?.marketItems?.length ? snapshot.marketItems : FALLBACK_ITEMS;
    const doubled = [...items, ...items];

    return (
        <Box sx={{ bgcolor: "#1a1a1a", borderBottom: "1px solid #333", overflow: "hidden", py: 0.75 }}>
            <Box
                sx={{
                    display: "inline-flex",
                    animation: "ticker-scroll 30s linear infinite",
                    "@keyframes ticker-scroll": {
                        "0%": { transform: "translateX(0)" },
                        "100%": { transform: "translateX(-50%)" },
                    },
                }}
            >
                {doubled.map((item, i) => (
                    <TickerItem key={`${item.key}-${i}`} item={item} />
                ))}
            </Box>
        </Box>
    );
}
