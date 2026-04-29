-- V2__seed_default_categories.sql
-- Minimal seed for news category mapping.

INSERT INTO categories (name, is_active) VALUES
    ('Genel Ekonomi', true),
    ('Hisse', true),
    ('Döviz', true),
    ('Emtia', true),
    ('Tahvil/Bono', true),
    ('Politika', true),
    ('Altın', true),
    ('Kripto Para', true),
    ('TCMB', true),
    ('Diğer', true)
ON CONFLICT (name) DO NOTHING;
