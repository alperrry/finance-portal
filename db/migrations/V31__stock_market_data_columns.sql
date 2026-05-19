ALTER TABLE stock
    ADD COLUMN IF NOT EXISTS previous_close   NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS market_cap       BIGINT,
    ADD COLUMN IF NOT EXISTS fifty_two_week_high NUMERIC(18, 4),
    ADD COLUMN IF NOT EXISTS fifty_two_week_low  NUMERIC(18, 4);
