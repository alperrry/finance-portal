-- V6__create_fund_tables.sql

-- Fon master tablosu
CREATE TABLE fund
(
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(10)  NOT NULL UNIQUE,
    name       VARCHAR(255) NOT NULL,
    fund_type  VARCHAR(10)  NOT NULL DEFAULT 'YAT',
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Günlük fiyat, yatırımcı sayısı, fon büyüklüğü (BindHistoryInfo)
CREATE TABLE fund_price
(
    id                  BIGSERIAL PRIMARY KEY,
    fund_id             BIGINT         NOT NULL REFERENCES fund (id),
    price_date          DATE           NOT NULL,
    price               NUMERIC(18, 6) NOT NULL,
    total_shares        NUMERIC(24, 2),
    investor_count      INTEGER,
    portfolio_size      NUMERIC(24, 2),
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fund_price UNIQUE (fund_id, price_date)
);

-- Günlük portföy dağılımı % (BindHistoryAllocation)
CREATE TABLE fund_allocation
(
    id                  BIGSERIAL PRIMARY KEY,
    fund_id             BIGINT    NOT NULL REFERENCES fund (id),
    allocation_date     DATE      NOT NULL,

    -- Hisse & Borçlanma
    hs                  NUMERIC(8, 4),   -- Hisse Senedi
    yhs                 NUMERIC(8, 4),   -- Yabancı Hisse Senedi
    kb                  NUMERIC(8, 4),   -- Kamu İç Borçlanma
    ob                  NUMERIC(8, 4),   -- Özel Sektör Borçlanma
    ykb                 NUMERIC(8, 4),   -- Yabancı Kamu Borçlanma
    yob                 NUMERIC(8, 4),   -- Yabancı Özel Borçlanma

    -- Para Piyasası & Mevduat
    tpp                 NUMERIC(8, 4),   -- Takasbank Para Piyasası
    vdm                 NUMERIC(8, 4),   -- Vadeli Mevduat
    vm                  NUMERIC(8, 4),   -- Vadesiz Mevduat
    r                   NUMERIC(8, 4),   -- Repo
    t                   NUMERIC(8, 4),   -- Ters Repo

    -- Döviz & Emtia
    d                   NUMERIC(8, 4),   -- Döviz
    altin               NUMERIC(8, 4),   -- Altın (GAS)
    gas                 NUMERIC(8, 4),   -- Gümüş/Altın/Emtia

    -- Diğer
    byf                 NUMERIC(8, 4),   -- Borsa Yatırım Fonu
    vint                NUMERIC(8, 4),   -- Yabancı Menkul Kıymet (VİNT)
    diger               NUMERIC(8, 4),   -- Diğer

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fund_allocation UNIQUE (fund_id, allocation_date)
);

-- Index'ler
CREATE INDEX idx_fund_price_date ON fund_price (price_date);
CREATE INDEX idx_fund_price_fund_id ON fund_price (fund_id);
CREATE INDEX idx_fund_allocation_date ON fund_allocation (allocation_date);
CREATE INDEX idx_fund_allocation_fund_id ON fund_allocation (fund_id);

-- 5 fon seed data
INSERT INTO fund (code, name, fund_type)
VALUES ('MAC', 'MARMARA CAPITAL PORTFÖY HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON)', 'YAT'),
       ('YAS', 'YAPI KREDİ PORTFÖY KOÇ HOLDİNG İŞTİRAK VE HİSSE SENEDİ FONU (HİSSE SENEDİ YOĞUN FON)', 'YAT'),
       ('KUT', 'KUVEYT TÜRK PORTFÖY KIYMETLİ MADENLER KATILIM FONU', 'YAT'),
       ('TGE', 'İŞ PORTFÖY EMTİA YABANCI BYF FON SEPETİ FONU', 'YAT'),
       ('AFT', 'AK PORTFÖY YENİ TEKNOLOJİLER YABANCI HİSSE SENEDİ FONU', 'YAT');