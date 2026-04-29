-- ============================================================
-- Flyway Migration
-- Version  : 1
-- Desc     : exchange_rate tablosunu oluştur
-- Author   : Market Module
-- Date     : 2025-02-23
-- ============================================================

CREATE TABLE IF NOT EXISTS exchange_rate
(
    id            BIGSERIAL       PRIMARY KEY,
    currency_code VARCHAR(3)      NOT NULL,
    currency_name VARCHAR(100)    NOT NULL,
    unit          INTEGER         NOT NULL DEFAULT 1,
    forex_buying  DECIMAL(18, 4),
    forex_selling DECIMAL(18, 4),
    rate_date     DATE            NOT NULL,
    source        VARCHAR(20)     NOT NULL DEFAULT 'TCMB',
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_currency_date UNIQUE (currency_code, rate_date)
    );

-- ============================================================
-- Index'ler
-- ============================================================

-- Tarihe göre sorgular için (günlük/aylık/yıllık listeleme)
CREATE INDEX IF NOT EXISTS idx_er_rate_date
    ON exchange_rate (rate_date DESC);

-- Döviz bazlı tarihsel sorgular için (USD son 30 gün gibi)
CREATE INDEX IF NOT EXISTS idx_er_currency_date
    ON exchange_rate (currency_code, rate_date DESC);

-- Source bazlı sorgular için (ileride TCMB dışı kaynak eklenirse)
CREATE INDEX IF NOT EXISTS idx_er_source
    ON exchange_rate (source);

-- ============================================================
-- Comment'ler
-- ============================================================

COMMENT ON TABLE exchange_rate IS
    'TCMB ve diğer kaynaklardan çekilen döviz kur verileri. Tarihsel veri tutulur.';

COMMENT ON COLUMN exchange_rate.currency_code IS
    'ISO 4217 döviz kodu. Örn: USD, EUR, GBP';

COMMENT ON COLUMN exchange_rate.currency_name IS
    'Dövizin tam adı. Örn: US DOLLAR, EURO';

COMMENT ON COLUMN exchange_rate.unit IS
    'Kur birimi. Çoğunlukla 1, JPY/KRW gibi kurlar için 100 olabilir';

COMMENT ON COLUMN exchange_rate.forex_buying IS
    'Döviz alış kuru. TCMB bazı kurlar için göndermeyebilir (null olabilir)';

COMMENT ON COLUMN exchange_rate.forex_selling IS
    'Döviz satış kuru. TCMB bazı kurlar için göndermeyebilir (null olabilir)';

COMMENT ON COLUMN exchange_rate.rate_date IS
    'Kurun ait olduğu tarih (TCMB yayın tarihi). created_at ile farklı olabilir';

COMMENT ON COLUMN exchange_rate.source IS
    'Verinin kaynağı. Şimdilik TCMB, ileride genişletilebilir';

COMMENT ON COLUMN exchange_rate.created_at IS
    'Kaydın veritabanına yazıldığı zaman';