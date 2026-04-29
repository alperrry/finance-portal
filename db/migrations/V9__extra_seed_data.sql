-- Altın, Ham Petrol, Bitcoin ve BIST Endeksleri
-- Bu enstrümanlar mevcut YahooService altyapısıyla otomatik çekilecektir.

INSERT INTO stock (symbol, short_name, long_name, sector, industry, exchange, currency, index_name) VALUES
                                                                                                        ('XU030.IS', 'BIST30',     'BIST 30 Endeksi',         NULL, NULL, 'IST', 'TRY', 'BIST30'),
                                                                                                        ('XU100.IS', 'BIST100',    'BIST 100 Endeksi',        NULL, NULL, 'IST', 'TRY', 'BIST100'),
                                                                                                        ('GC=F',     'Altın',      'Gold Futures',            NULL, NULL, 'CMX', 'USD', 'EMTIA'),
                                                                                                        ('CL=F',     'Ham Petrol', 'Crude Oil Futures (WTI)', NULL, NULL, 'NYM', 'USD', 'EMTIA'),
                                                                                                        ('BTC-USD',  'Bitcoin',    'Bitcoin USD',             NULL, NULL, 'CCC', 'USD', 'KRIPTO')
    ON CONFLICT (symbol) DO NOTHING;