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

type KapitalTickerProps = {
    className?: string;
};

export default function KapitalTicker({ className = "" }: KapitalTickerProps) {
    return (
        <div className={`kp-ticker-bar ${className}`.trim()}>
            <div className="kp-ticker-track">
                {rollingItems.map((item, index) => (
                    <div className="kp-ticker-item" key={`${item.name}-${index}`}>
                        <span className="kp-ticker-name">{item.name}</span>
                        <span>{item.price}</span>
                        <span className={`kp-ticker-change ${item.direction}`}>{item.change}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
