-- BOLUC.IS, KOZAA.IS, KOZAL.IS: Yahoo Finance "No data found, symbol may be delisted"
UPDATE stock
SET is_active = false
WHERE symbol IN ('BOLUC.IS', 'KOZAA.IS', 'KOZAL.IS');
