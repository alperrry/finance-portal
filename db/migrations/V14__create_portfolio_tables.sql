-- Portföy yönetimi modülü için tablolar
-- FR-19, FR-20, FR-21, FR-22

-- ============================================================
-- portfolios: Kullanıcının portföyleri (1:N)
-- ============================================================
CREATE TABLE portfolios (
                            id               BIGSERIAL PRIMARY KEY,
                            user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                            name             VARCHAR(255) NOT NULL,
                            balance          NUMERIC(18,2) NOT NULL DEFAULT 1000000000,
                            display_currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
                            version          BIGINT NOT NULL DEFAULT 0,
                            created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_user_id ON portfolios(user_id);

COMMENT ON TABLE portfolios IS 'Kullanıcıya ait portföyler';
COMMENT ON COLUMN portfolios.balance IS 'Sanal bakiye (default 1 milyar TL, kontrol disabled)';
COMMENT ON COLUMN portfolios.display_currency IS 'Portföy görüntüleme para birimi (TRY/USD/EUR)';
COMMENT ON COLUMN portfolios.version IS 'Optimistic locking için version kolonu';

-- ============================================================
-- portfolio_items: Portföydeki enstrümanlar (polimorfik ilişki)
-- ============================================================
CREATE TABLE portfolio_items (
                                 id              BIGSERIAL PRIMARY KEY,
                                 portfolio_id    BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE RESTRICT,
                                 instrument_type VARCHAR(20) NOT NULL,
                                 instrument_id   BIGINT NOT NULL,
                                 quantity        NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
                                 avg_cost        NUMERIC(18,6) NOT NULL CHECK (avg_cost > 0),
                                 version         BIGINT NOT NULL DEFAULT 0,
                                 created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                 updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                 CONSTRAINT uq_portfolio_instrument UNIQUE (portfolio_id, instrument_type, instrument_id)
);

CREATE INDEX idx_portfolio_items_portfolio_id ON portfolio_items(portfolio_id);
CREATE INDEX idx_portfolio_items_instrument ON portfolio_items(instrument_type, instrument_id);

COMMENT ON TABLE portfolio_items IS 'Portföydeki enstrüman pozisyonları';
COMMENT ON COLUMN portfolio_items.instrument_type IS 'STOCK, FUND, FX, BOND';
COMMENT ON COLUMN portfolio_items.instrument_id IS 'İlgili enstrüman tablosundaki kayıt ID''si (polimorfik)';
COMMENT ON COLUMN portfolio_items.avg_cost IS 'Average Cost yöntemi ile hesaplanan ortalama maliyet';

-- ============================================================
-- trade_transactions: Alış/satış işlem kayıtları
-- ============================================================
CREATE TABLE trade_transactions (
                                    id                   BIGSERIAL PRIMARY KEY,
                                    portfolio_id         BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE RESTRICT,
                                    instrument_type      VARCHAR(20) NOT NULL,
                                    instrument_id        BIGINT NOT NULL,
                                    transaction_type     VARCHAR(10) NOT NULL,
                                    quantity             NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
                                    target_price         NUMERIC(18,6) NOT NULL CHECK (target_price > 0),
                                    executed_price       NUMERIC(18,6),
                                    total_amount         NUMERIC(18,2),
                                    realized_profit_loss NUMERIC(18,2),
                                    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                                    rejection_reason     TEXT,
                                    jbpm_process_id      VARCHAR(255),
                                    processed_at         TIMESTAMPTZ,
                                    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                    CONSTRAINT ck_trade_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
                                    CONSTRAINT ck_trade_type CHECK (transaction_type IN ('BUY', 'SELL'))
);

CREATE INDEX idx_trade_portfolio_status ON trade_transactions(portfolio_id, status);
CREATE INDEX idx_trade_instrument ON trade_transactions(instrument_type, instrument_id);
CREATE INDEX idx_trade_pending ON trade_transactions(status) WHERE status = 'PENDING';
CREATE INDEX idx_trade_updated_at ON trade_transactions(updated_at DESC);

COMMENT ON TABLE trade_transactions IS 'Limit order tabanlı alış/satış işlem kayıtları';
COMMENT ON COLUMN trade_transactions.target_price IS 'Kullanıcının hedeflediği fiyat (limit order)';
COMMENT ON COLUMN trade_transactions.executed_price IS 'Gerçekleşme fiyatı (APPROVED olduğunda doldurulur)';
COMMENT ON COLUMN trade_transactions.total_amount IS 'quantity * executed_price';
COMMENT ON COLUMN trade_transactions.realized_profit_loss IS 'SELL işlemlerinde realized P/L (BUY için null)';
COMMENT ON COLUMN trade_transactions.status IS 'PENDING, APPROVED, REJECTED, CANCELLED';
COMMENT ON COLUMN trade_transactions.rejection_reason IS 'REJECTED olduğunda red gerekçesi';
COMMENT ON COLUMN trade_transactions.jbpm_process_id IS 'jBPM süreç instance ID (ileride kullanılmak üzere, şu an null)';
COMMENT ON COLUMN trade_transactions.processed_at IS 'PENDING dışı bir duruma geçiş zamanı';