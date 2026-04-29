-- -----------------------------------------------------
-- 1. STOCK (Hisse Bilgileri)
-- Sabit referans tablo - 30 satır, değişmez
-- -----------------------------------------------------
CREATE TABLE stock (
                       id                  BIGSERIAL       PRIMARY KEY,
                       symbol              VARCHAR(20)     NOT NULL UNIQUE,
                       short_name          VARCHAR(100),
                       long_name           VARCHAR(255),
                       sector              VARCHAR(100),
                       industry            VARCHAR(100),
                       exchange            VARCHAR(50),
                       currency            VARCHAR(10)     DEFAULT 'TRY',
                       index_name          VARCHAR(50),
                       is_active           BOOLEAN         DEFAULT TRUE,
                       created_at          TIMESTAMP       DEFAULT NOW(),
                       updated_at          TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE  stock            IS 'Hisse senedi temel bilgileri - sabit referans data';
COMMENT ON COLUMN stock.symbol     IS 'Yahoo Finance sembolü, örn: THYAO.IS';
COMMENT ON COLUMN stock.index_name IS 'Hangi endekste: BIST30, BIST100';

-- -----------------------------------------------------
-- 2. STOCK_PRICE_SNAPSHOT (Anlık Fiyat - Geçici)
-- Borsa saatlerinde (10:00-18:00) periyodik çekilir.
-- Gün içi grafik için kullanılır.
-- Borsa kapanışında (18:00) tablo temizlenir.
-- -----------------------------------------------------
CREATE TABLE stock_price_snapshot (
                                      id                      BIGSERIAL       PRIMARY KEY,
                                      stock_id                BIGINT          NOT NULL REFERENCES stock(id),
                                      price                   NUMERIC(18,4)   NOT NULL,
                                      change                  NUMERIC(18,4),
                                      change_percent          NUMERIC(10,4),
                                      open                    NUMERIC(18,4),
                                      day_high                NUMERIC(18,4),
                                      day_low                 NUMERIC(18,4),
                                      previous_close          NUMERIC(18,4),
                                      volume                  BIGINT,
                                      market_cap              BIGINT,
                                      fifty_two_week_high     NUMERIC(18,4),
                                      fifty_two_week_low      NUMERIC(18,4),
                                      trade_date              DATE            DEFAULT CURRENT_DATE,
                                      fetched_at              TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE  stock_price_snapshot            IS 'Gün içi anlık fiyat - borsa kapanışında temizlenir';
COMMENT ON COLUMN stock_price_snapshot.trade_date IS 'Temizleme işlemi için: DELETE WHERE trade_date < CURRENT_DATE';
COMMENT ON COLUMN stock_price_snapshot.fetched_at IS 'Yahoo Finance den verinin çekildiği timestamp';

-- -----------------------------------------------------
-- 3. STOCK_PRICE_HISTORY (Günlük OHLCV - Kalıcı)
-- Bootstrap: uygulama ilk açılışta 1 yıllık veri toplu çekilir.
-- Sonra her gün 18:00 kapanışında 1 kayıt eklenir.
-- Haftalık/aylık/yıllık grafik buradan çizilir.
-- Veri silinmez, birikir.
-- -----------------------------------------------------
CREATE TABLE stock_price_history (
                                     id              BIGSERIAL       PRIMARY KEY,
                                     stock_id        BIGINT          NOT NULL REFERENCES stock(id),
                                     trade_date      DATE            NOT NULL,
                                     open_price      NUMERIC(18,4),
                                     high_price      NUMERIC(18,4),
                                     low_price       NUMERIC(18,4),
                                     close_price     NUMERIC(18,4)   NOT NULL,
                                     adj_close       NUMERIC(18,4),
                                     volume          BIGINT,
                                     created_at      TIMESTAMP       DEFAULT NOW(),

                                     CONSTRAINT uq_history_stock_date UNIQUE (stock_id, trade_date)
);

COMMENT ON TABLE  stock_price_history           IS 'Günlük OHLCV - kalıcı, birikir. Bootstrap ile 1 yıllık veri yüklenir.';
COMMENT ON COLUMN stock_price_history.adj_close IS 'Temettü ve bölünme düzeltmeli kapanış fiyatı';

-- -----------------------------------------------------
-- 4. STOCK_TECHNICAL_INDICATOR (Teknik Göstergeler - Kalıcı)
-- Her gün 18:00 sonrası stock_price_history den hesaplanır.
-- Veri silinmez, birikir.
-- -----------------------------------------------------
CREATE TABLE stock_technical_indicator (
                                           id              BIGSERIAL       PRIMARY KEY,
                                           stock_id        BIGINT          NOT NULL REFERENCES stock(id),
                                           trade_date      DATE            NOT NULL,

    -- RSI (Relative Strength Index) - 0 ile 100 arası
    -- 70 üzeri: aşırı alım, 30 altı: aşırı satım
                                           rsi_14          NUMERIC(10,4),

    -- MACD (Moving Average Convergence Divergence)
    -- macd_line = 12 EMA - 26 EMA
    -- macd_signal = macd_line'ın 9 günlük EMA'sı
    -- macd_histogram = macd_line - macd_signal
                                           macd_line       NUMERIC(18,6),
                                           macd_signal     NUMERIC(18,6),
                                           macd_histogram  NUMERIC(18,6),

    -- SMA (Simple Moving Average)
                                           sma_20          NUMERIC(18,4),
                                           sma_50          NUMERIC(18,4),
                                           sma_200         NUMERIC(18,4),

    -- EMA (Exponential Moving Average)
                                           ema_12          NUMERIC(18,4),
                                           ema_26          NUMERIC(18,4),

                                           created_at      TIMESTAMP       DEFAULT NOW(),

                                           CONSTRAINT uq_indicator_stock_date UNIQUE (stock_id, trade_date)
);

COMMENT ON TABLE  stock_technical_indicator                IS 'Teknik göstergeler - history den hesaplanır, kalıcı';
COMMENT ON COLUMN stock_technical_indicator.rsi_14         IS '0-100 arası. 70+ aşırı alım, 30- aşırı satım';
COMMENT ON COLUMN stock_technical_indicator.macd_histogram IS 'Pozitif = yükseliş baskısı, Negatif = düşüş baskısı';

-- -----------------------------------------------------
-- INDEX'LER
-- -----------------------------------------------------

-- Stock
CREATE INDEX idx_stock_symbol      ON stock(symbol);
CREATE INDEX idx_stock_index_name  ON stock(index_name);
CREATE INDEX idx_stock_is_active   ON stock(is_active);

-- Snapshot - trade_date ile toplu silme yapılacak
CREATE INDEX idx_snapshot_stock_id   ON stock_price_snapshot(stock_id);
CREATE INDEX idx_snapshot_trade_date ON stock_price_snapshot(trade_date);
CREATE INDEX idx_snapshot_fetched_at ON stock_price_snapshot(fetched_at DESC);

-- History - tarih bazlı sorgular
CREATE INDEX idx_history_stock_id   ON stock_price_history(stock_id);
CREATE INDEX idx_history_trade_date ON stock_price_history(trade_date DESC);

-- Indicator - tarih bazlı sorgular
CREATE INDEX idx_indicator_stock_id   ON stock_technical_indicator(stock_id);
CREATE INDEX idx_indicator_trade_date ON stock_technical_indicator(trade_date DESC);
