-- V8__seed_bond_data.sql
-- Aktif Türk Devlet Tahvilleri / Hazine Bonoları - TCMB EVDS
-- Seri kodları TP.<ISIN>.ORAN formatında (nokta ile, alt tire değil)
-- maturity_days: BUGÜNDEN (11.03.2026) kalan yaklaşık gün sayısı

-- ============================================================
-- KISA VADELİ (Hazine Bonosu / ~1 yıl altı)
-- ============================================================

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRD210826F19.ORAN', 'Hazine Bonosu 2026 Ağustos (TRD210826F19)', 'HAZINE_BONOSU', 163, 'TRY', true, NOW(), NOW());

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRD181126K12.ORAN', 'Hazine Bonosu 2026 Kasım (TRD181126K12)', 'HAZINE_BONOSU', 252, 'TRY', true, NOW(), NOW());

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRT060127K35.ORAN', 'Devlet Tahvili 2027 Ocak (TRT060127K35)', 'HAZINE_BONOSU', 301, 'TRY', true, NOW(), NOW());

-- ============================================================
-- ORTA VADELİ (1-3 yıl)
-- ============================================================

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRD190527K18.ORAN', 'Devlet Tahvili 2027 Mayıs (TRD190527K18)', 'DEVLET_TAHVIL', 434, 'TRY', true, NOW(), NOW());

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRT050128K27.ORAN', 'Devlet Tahvili 2028 Ocak (TRT050128K27)', 'DEVLET_TAHVIL', 666, 'TRY', true, NOW(), NOW());

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRT050728K21.ORAN', 'Devlet Tahvili 2028 Temmuz (TRT050728K21)', 'DEVLET_TAHVIL', 847, 'TRY', true, NOW(), NOW());

-- ============================================================
-- UZUN VADELİ (3+ yıl)
-- ============================================================

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRT040729K21.ORAN', 'Devlet Tahvili 2029 Temmuz (TRT040729K21)', 'DEVLET_TAHVIL', 1211, 'TRY', true, NOW(), NOW());

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRT030430K22.ORAN', 'Devlet Tahvili 2030 Nisan (TRT030430K22)', 'DEVLET_TAHVIL', 1484, 'TRY', true, NOW(), NOW());

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRT021030A19.ORAN', 'Devlet Tahvili 2030 Ekim (TRT021030A19) - Gösterge', 'DEVLET_TAHVIL', 1671, 'TRY', true, NOW(), NOW());

INSERT INTO bond (evds_series_code, name, bond_type, maturity_days, currency, is_active, created_at, updated_at)
VALUES ('TP.TRT080131A13.ORAN', 'Devlet Tahvili 2031 Ocak (TRT080131A13)', 'DEVLET_TAHVIL', 1764, 'TRY', true, NOW(), NOW());