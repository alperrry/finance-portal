export interface StockIndicator {
    symbol: string;
    tradeDate: string;
    rsi14: number | null;
    macdLine: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema26: number | null;
    bollingerUpper: number | null;
    bollingerMiddle: number | null;
    bollingerLower: number | null;
    stochasticK: number | null;
    stochasticD: number | null;
    atr14: number | null;
    ichimokuTenkan: number | null;
    ichimokuKijun: number | null;
    ichimokuSenkouA: number | null;
    ichimokuSenkouB: number | null;
}
