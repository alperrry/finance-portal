-- Yahoo Finance'da 404 döndüren (delistelenen/geçersiz) semboller
UPDATE stock SET is_active = false WHERE symbol IN ('IPEKE.IS', 'KERVT.IS', 'SELEC.IS');
