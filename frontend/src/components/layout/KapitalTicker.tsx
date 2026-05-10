import { Box, GlobalStyles } from "@mui/material";

type TickerDirection = "up" | "down";

type TickerItem = {
    name: string;
    price: string;
    change: string;
    direction: TickerDirection;
};

const tickerItems: TickerItem[] = [
    { name: "BIST 100", price: "9.847,32", change: "▲ +1.24%", direction: "up" },
    { name: "USD/TRY", price: "32,4850", change: "▼ -0.38%", direction: "down" },
    { name: "EUR/TRY", price: "35,1240", change: "▼ -0.22%", direction: "down" },
    { name: "ALTIN", price: "2.341,80", change: "▲ +0.87%", direction: "up" },
    { name: "BTC", price: "$67.420", change: "▲ +2.41%", direction: "up" },
    { name: "BRENT", price: "$82,64", change: "▼ -0.54%", direction: "down" },
    { name: "S&P 500", price: "5.248,92", change: "▲ +0.31%", direction: "up" },
    { name: "NASDAQ", price: "16.430,5", change: "▲ +0.58%", direction: "up" },
    { name: "THYAO", price: "244,20", change: "▲ +3.82%", direction: "up" },
    { name: "GARAN", price: "83,45", change: "▲ +2.10%", direction: "up" },
];

const rollingItems = [...tickerItems, ...tickerItems];

export default function KapitalTicker() {
    return (
        <>
            <GlobalStyles styles={{
                "@keyframes kpTickerMove": {
                    "0%": { transform: "translateX(0)" },
                    "100%": { transform: "translateX(-50%)" },
                },
            }} />
            <Box
                sx={{
                    bgcolor: "#0e0e0e",
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    position: "relative",
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 72,
                        background: "linear-gradient(to right, transparent, #0e0e0e)",
                        pointerEvents: "none",
                        zIndex: 2,
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        whiteSpace: "nowrap",
                        width: "max-content",
                        animation: "kpTickerMove 30s linear infinite",
                        "&:hover": { animationPlayState: "paused" },
                    }}
                >
                    {rollingItems.map((item, index) => (
                        <Box
                            key={`${item.name}-${index}`}
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                px: "26px",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: 11,
                                color: "rgba(255, 255, 255, 0.84)",
                            }}
                        >
                            <Box component="span" sx={{ color: "rgba(255, 255, 255, 0.38)", fontSize: 10, letterSpacing: "0.06em" }}>
                                {item.name}
                            </Box>
                            <Box component="span">{item.price}</Box>
                            <Box
                                component="span"
                                sx={{
                                    fontWeight: 600,
                                    color: item.direction === "up" ? "#5bb870" : "#e05858",
                                }}
                            >
                                {item.change}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </>
    );
}
