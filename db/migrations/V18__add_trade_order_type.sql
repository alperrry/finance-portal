ALTER TABLE trade_transactions
    ADD COLUMN order_type VARCHAR(10) NOT NULL DEFAULT 'LIMIT';

ALTER TABLE trade_transactions
    ALTER COLUMN target_price DROP NOT NULL;

ALTER TABLE trade_transactions
    DROP CONSTRAINT IF EXISTS trade_transactions_target_price_check;

ALTER TABLE trade_transactions
    ADD CONSTRAINT ck_trade_order_type CHECK (order_type IN ('MARKET', 'LIMIT'));

COMMENT ON COLUMN trade_transactions.order_type IS 'MARKET veya LIMIT';
COMMENT ON COLUMN trade_transactions.target_price IS 'LIMIT emirlerde hedef fiyat; MARKET emirlerde null';
