-- Kullanıcı bakiye kolonu eklenmesi (portfolios.balance'dan taşınıyor)
ALTER TABLE users ADD COLUMN balance NUMERIC(18,2) NOT NULL DEFAULT 1000000.00;

-- Kullanıcı bakiyesi trade işlemlerinde güncelleneceği için optimistic locking kolonu.
ALTER TABLE users ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- Mevcut kullanıcılar için: portföylerinin toplam bakiyesini user'a taşı
UPDATE users u
SET balance = COALESCE(
    (SELECT SUM(p.balance) FROM portfolios p WHERE p.user_id = u.id),
    1000000.00
);

COMMENT ON COLUMN users.balance IS 'Kullanıcının sanal bakiyesi (TRY). Tüm portföyler bu bakiyeden harcama yapar.';
COMMENT ON COLUMN users.version IS 'Kullanıcı bakiyesi optimistic locking için version kolonu';
