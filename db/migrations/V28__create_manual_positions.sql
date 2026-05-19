CREATE TABLE manual_positions (
    id                  BIGSERIAL PRIMARY KEY,
    portfolio_id        BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE RESTRICT,
    instrument_type     VARCHAR(20) NOT NULL,
    position_kind       VARCHAR(10) NOT NULL CHECK (position_kind IN ('OPEN', 'CLOSED')),
    instrument_id       BIGINT,
    instrument_symbol   VARCHAR(50),
    instrument_name     VARCHAR(255),
    direction           VARCHAR(5) NOT NULL DEFAULT 'LONG',
    quantity            NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
    entry_price         NUMERIC(18,6) NOT NULL CHECK (entry_price >= 0),
    entry_date          DATE NOT NULL,
    exit_price          NUMERIC(18,6),
    exit_date           DATE,
    contract_multiplier NUMERIC(10,4),
    maturity_date       DATE,
    margin_amount       NUMERIC(18,2),
    underlying_symbol   VARCHAR(50),
    interest_rate       NUMERIC(8,4),
    bank_name           VARCHAR(100),
    realized_pnl        NUMERIC(18,2),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_closed_has_exit CHECK (
        position_kind != 'CLOSED' OR (exit_price IS NOT NULL AND exit_date IS NOT NULL)
    )
);
CREATE INDEX idx_manual_pos_portfolio ON manual_positions(portfolio_id);
CREATE INDEX idx_manual_pos_kind ON manual_positions(portfolio_id, position_kind);
