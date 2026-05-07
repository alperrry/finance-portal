ALTER TABLE news
    ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN news.image_url IS 'Haber kaynağından gelen remote görsel URL değeri.';
