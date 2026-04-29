-- -----------------------------------------------------
-- V12: Premium teknik indikatörler
-- Bollinger Bands, Stochastic, ATR, VWAP, Ichimoku
-- -----------------------------------------------------

ALTER TABLE stock_technical_indicator
    -- Bollinger Bands (middle = SMA20, upper/lower = ±2σ)
    ADD COLUMN bollinger_upper   NUMERIC(18,4),
    ADD COLUMN bollinger_middle  NUMERIC(18,4),
    ADD COLUMN bollinger_lower   NUMERIC(18,4),

    -- Stochastic Oscillator (0-100)
    -- %K = fast line, %D = slow line (3-period SMA of %K)
    ADD COLUMN stochastic_k      NUMERIC(10,4),
    ADD COLUMN stochastic_d      NUMERIC(10,4),

    -- ATR (Average True Range) - 14 gün, volatilite ölçümü
    ADD COLUMN atr_14            NUMERIC(18,4),

    -- VWAP (Volume Weighted Average Price) - günlük
    ADD COLUMN vwap              NUMERIC(18,4),

    -- Ichimoku Cloud (4 çizgi — Chikou frontend'de hesaplanacak)
    -- Tenkan-sen (9), Kijun-sen (26), Senkou Span A, Senkou Span B (52)
    -- NOT: Senkou A/B hesaplandığı gün satırına yazılır,
    --      frontend +26 gün shift ederek çizer.
    ADD COLUMN ichimoku_tenkan    NUMERIC(18,4),
    ADD COLUMN ichimoku_kijun     NUMERIC(18,4),
    ADD COLUMN ichimoku_senkou_a  NUMERIC(18,4),
    ADD COLUMN ichimoku_senkou_b  NUMERIC(18,4);

COMMENT ON COLUMN stock_technical_indicator.bollinger_upper    IS 'SMA20 + 2*stddev(20)';
COMMENT ON COLUMN stock_technical_indicator.bollinger_middle   IS 'SMA20 (bollinger_middle = sma_20 olur, redundant ama explicit)';
COMMENT ON COLUMN stock_technical_indicator.bollinger_lower    IS 'SMA20 - 2*stddev(20)';
COMMENT ON COLUMN stock_technical_indicator.stochastic_k       IS '%K fast line, 14-period (0-100)';
COMMENT ON COLUMN stock_technical_indicator.stochastic_d       IS '%D slow line, 3-period SMA of %K (0-100)';
COMMENT ON COLUMN stock_technical_indicator.atr_14             IS '14-period Average True Range, volatilite';
COMMENT ON COLUMN stock_technical_indicator.vwap               IS 'Günlük VWAP — gerçekçi değil single-day OHLCV ile. Referans amaçlı.';
COMMENT ON COLUMN stock_technical_indicator.ichimoku_tenkan    IS 'Conversion Line - (9-high + 9-low) / 2';
COMMENT ON COLUMN stock_technical_indicator.ichimoku_kijun     IS 'Base Line - (26-high + 26-low) / 2';
COMMENT ON COLUMN stock_technical_indicator.ichimoku_senkou_a  IS 'Leading Span A = (Tenkan + Kijun) / 2. Frontend +26 gün shift eder.';
COMMENT ON COLUMN stock_technical_indicator.ichimoku_senkou_b  IS 'Leading Span B = (52-high + 52-low) / 2. Frontend +26 gün shift eder.';