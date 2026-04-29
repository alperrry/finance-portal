-- -----------------------------------------------------
-- V13: VWAP kolonu kaldırıldı
-- Daily OHLCV ile gerçek VWAP hesaplanamaz (intraday tick verisi gerekir).
-- (H+L+C)/3 proxy yanıltıcı olduğu için tamamen kaldırıldı.
-- -----------------------------------------------------

ALTER TABLE stock_technical_indicator
DROP COLUMN vwap;