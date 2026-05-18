-- TÜFE base year changed from 2003=100 to 2025=100 (TÜİK, January 2026)
-- Old EVDS series: TP.FE.OKTG01 (discontinued Dec 2025)
-- New EVDS series: TP.FE25.OKTG01 (starts Jan 2024, 2025=100 scale)

UPDATE macro_series
SET series_code  = 'TP.FE25.OKTG01',
    display_name = 'TÜFE Genel Endeks (2025=100)',
    updated_at   = NOW()
WHERE data_type = 'INFLATION'
  AND series_code = 'TP.FE.OKTG01';

-- Remove 2003=100 scale observations (values > 1000 cannot exist in 2025=100 scale)
DELETE FROM macro_observation
WHERE series_id = (SELECT id FROM macro_series WHERE series_code = 'TP.FE25.OKTG01')
  AND value > 1000;

-- Backfill 2024-01 through 2026-04 (full history for annual change calculation)
INSERT INTO macro_observation (series_id, observation_date, value, source)
SELECT s.id, obs.dt, obs.v, 'EVDS'
FROM macro_series s,
(VALUES
    ('2024-01-01'::date, 62.33),
    ('2024-02-01'::date, 65.15),
    ('2024-03-01'::date, 67.21),
    ('2024-04-01'::date, 69.35),
    ('2024-05-01'::date, 71.68),
    ('2024-06-01'::date, 72.86),
    ('2024-07-01'::date, 75.21),
    ('2024-08-01'::date, 77.07),
    ('2024-09-01'::date, 79.36),
    ('2024-10-01'::date, 81.64),
    ('2024-11-01'::date, 83.48),
    ('2024-12-01'::date, 84.33),
    ('2025-01-01'::date, 88.58),
    ('2025-02-01'::date, 90.59),
    ('2025-03-01'::date, 92.82),
    ('2025-04-01'::date, 95.60),
    ('2025-05-01'::date, 97.06),
    ('2025-06-01'::date, 98.40),
    ('2025-07-01'::date, 100.42),
    ('2025-08-01'::date, 102.47),
    ('2025-09-01'::date, 105.78),
    ('2025-10-01'::date, 108.48),
    ('2025-11-01'::date, 109.42),
    ('2025-12-01'::date, 110.39),
    ('2026-01-01'::date, 115.73),
    ('2026-02-01'::date, 119.16),
    ('2026-03-01'::date, 121.47),
    ('2026-04-01'::date, 126.55)
) AS obs(dt, v)
WHERE s.series_code = 'TP.FE25.OKTG01'
ON CONFLICT (series_id, observation_date) DO NOTHING;
