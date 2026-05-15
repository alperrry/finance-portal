ALTER TABLE exchange_rate
    ADD COLUMN banknote_buying  DECIMAL(18, 4),
    ADD COLUMN banknote_selling DECIMAL(18, 4);
