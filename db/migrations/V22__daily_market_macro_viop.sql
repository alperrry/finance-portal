CREATE TABLE IF NOT EXISTS macro_series (
    id               BIGSERIAL PRIMARY KEY,
    series_code      VARCHAR(100) NOT NULL UNIQUE,
    display_name     VARCHAR(255) NOT NULL,
    data_type        VARCHAR(30)  NOT NULL,
    frequency        VARCHAR(20)  NOT NULL DEFAULT 'MONTHLY',
    unit             VARCHAR(50),
    source           VARCHAR(20)  NOT NULL DEFAULT 'EVDS',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_macro_series_type CHECK (data_type IN ('INFLATION', 'DEPOSIT_RATE'))
);

CREATE INDEX IF NOT EXISTS idx_macro_series_type_active ON macro_series(data_type, is_active);

CREATE TABLE IF NOT EXISTS macro_observation (
    id               BIGSERIAL PRIMARY KEY,
    series_id        BIGINT       NOT NULL REFERENCES macro_series(id) ON DELETE CASCADE,
    observation_date DATE         NOT NULL,
    value            NUMERIC(18,6) NOT NULL,
    source           VARCHAR(20)  NOT NULL DEFAULT 'EVDS',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_macro_series_date UNIQUE (series_id, observation_date)
);

CREATE INDEX IF NOT EXISTS idx_macro_observation_series_date
    ON macro_observation(series_id, observation_date DESC);

INSERT INTO macro_series (series_code, display_name, data_type, frequency, unit, source, is_active)
VALUES
    ('TP.FE.OKTG01', 'TÜFE Genel Endeks (2003=100)', 'INFLATION', 'MONTHLY', 'INDEX', 'EVDS', TRUE),
    ('TP.TRY.MT01', 'TL Mevduat Faizi - 1 Aya Kadar', 'DEPOSIT_RATE', 'WEEKLY', 'PERCENT', 'EVDS', TRUE),
    ('TP.TRY.MT02', 'TL Mevduat Faizi - 3 Aya Kadar', 'DEPOSIT_RATE', 'WEEKLY', 'PERCENT', 'EVDS', TRUE),
    ('TP.TRY.MT03', 'TL Mevduat Faizi - 6 Aya Kadar', 'DEPOSIT_RATE', 'WEEKLY', 'PERCENT', 'EVDS', TRUE),
    ('TP.TRY.MT04', 'TL Mevduat Faizi - 1 Yıla Kadar', 'DEPOSIT_RATE', 'WEEKLY', 'PERCENT', 'EVDS', TRUE),
    ('TP.TRY.MT05', 'TL Mevduat Faizi - 1 Yıl ve Üzeri', 'DEPOSIT_RATE', 'WEEKLY', 'PERCENT', 'EVDS', TRUE)
ON CONFLICT (series_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS viop_contract_price (
    id                  BIGSERIAL PRIMARY KEY,
    market_segment      VARCHAR(120) NOT NULL,
    contract_name       VARCHAR(255) NOT NULL,
    underlying_symbol   VARCHAR(50),
    maturity_text       VARCHAR(80),
    last_price          NUMERIC(18,6),
    change_percent      NUMERIC(10,4),
    change_amount       NUMERIC(18,6),
    volume_try          NUMERIC(24,2),
    volume_quantity     BIGINT,
    trade_date          DATE NOT NULL,
    fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source              VARCHAR(30) NOT NULL DEFAULT 'ISYATIRIM',
    CONSTRAINT uq_viop_contract_date UNIQUE (market_segment, contract_name, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_viop_contract_trade_date
    ON viop_contract_price(trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_viop_contract_segment_date
    ON viop_contract_price(market_segment, trade_date DESC);

INSERT INTO stock (symbol, short_name, long_name, sector, industry, exchange, currency, index_name)
VALUES
    ('ETH-USD', 'Ethereum', 'Ethereum USD', NULL, NULL, 'CCC', 'USD', 'KRIPTO'),
    ('SI=F', 'Gümüş', 'Silver Futures', NULL, NULL, 'CMX', 'USD', 'EMTIA'),
    ('PL=F', 'Platin', 'Platinum Futures', NULL, NULL, 'NYM', 'USD', 'EMTIA'),
    ('PA=F', 'Paladyum', 'Palladium Futures', NULL, NULL, 'NYM', 'USD', 'EMTIA')
ON CONFLICT (symbol) DO NOTHING;

UPDATE stock SET index_name = 'KRIPTO' WHERE symbol = 'BTC-USD';
UPDATE stock SET index_name = 'EMTIA' WHERE symbol IN ('GC=F', 'CL=F');

INSERT INTO scheduler_job (job_name, display_name, job_group, cron_expression, enabled)
VALUES
    ('macro-inflation-fetch', 'EVDS Enflasyon Çekimi', 'MARKET_MACRO', 'daily-02:25', TRUE),
    ('macro-deposit-fetch', 'EVDS Vadeli Mevduat Çekimi', 'MARKET_MACRO', 'daily-02:20', TRUE),
    ('macro-backfill', 'EVDS Makro Backfill', 'MARKET_MACRO', 'manual', TRUE),
    ('viop-fetch', 'İş Yatırım VİOP Çekimi', 'MARKET_VIOP', 'daily-02:30', TRUE)
ON CONFLICT (job_name) DO NOTHING;
