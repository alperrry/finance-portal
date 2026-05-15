ALTER TABLE stock
    ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(20) NOT NULL DEFAULT 'STOCK';

ALTER TABLE stock
    DROP CONSTRAINT IF EXISTS ck_stock_instrument_type;

ALTER TABLE stock
    ADD CONSTRAINT ck_stock_instrument_type
        CHECK (instrument_type IN ('STOCK', 'INDEX', 'COMMODITY', 'CRYPTO'));

UPDATE stock
SET instrument_type = 'INDEX',
    index_name = CASE
        WHEN symbol = 'XU030.IS' THEN 'BIST30'
        WHEN symbol = 'XU100.IS' THEN 'BIST100'
        ELSE index_name
    END
WHERE symbol IN ('XU030.IS', 'XU100.IS');

UPDATE stock
SET instrument_type = 'COMMODITY',
    index_name = 'EMTIA'
WHERE symbol IN ('GC=F', 'CL=F', 'SI=F', 'PL=F', 'PA=F');

UPDATE stock
SET instrument_type = 'CRYPTO',
    index_name = 'KRIPTO'
WHERE symbol IN ('BTC-USD', 'ETH-USD');

CREATE INDEX IF NOT EXISTS idx_stock_instrument_type_active
    ON stock(instrument_type, is_active);
