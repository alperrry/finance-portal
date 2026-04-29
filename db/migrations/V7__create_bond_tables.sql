-- 3.4 Tahvil / Bono tabloları

CREATE TABLE bond
(
    id               BIGSERIAL    PRIMARY KEY,
    evds_series_code VARCHAR(100) NOT NULL UNIQUE,
    name             VARCHAR(255) NOT NULL,
    bond_type        VARCHAR(20)  NOT NULL,
    maturity_days    INTEGER,
    currency         VARCHAR(10)  NOT NULL DEFAULT 'TRY',
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bond_evds_series_code ON bond (evds_series_code);
CREATE INDEX idx_bond_type             ON bond (bond_type);
CREATE INDEX idx_bond_is_active        ON bond (is_active);

-- --------------------------------------------------------

CREATE TABLE bond_rate_history
(
    id              BIGSERIAL      PRIMARY KEY,
    bond_id         BIGINT         NOT NULL REFERENCES bond (id),
    rate_date       DATE           NOT NULL,
    interest_rate   NUMERIC(10, 4) NOT NULL,
    compounded_rate NUMERIC(10, 4),
    source          VARCHAR(20)    NOT NULL DEFAULT 'TCMB_EVDS',
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bond_rate_date UNIQUE (bond_id, rate_date)
);

CREATE INDEX idx_bond_rate_bond_id   ON bond_rate_history (bond_id);
CREATE INDEX idx_bond_rate_date      ON bond_rate_history (rate_date DESC);
CREATE INDEX idx_bond_rate_bond_date ON bond_rate_history (bond_id, rate_date DESC);