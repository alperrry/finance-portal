CREATE TABLE scheduler_job (
                               id                BIGSERIAL PRIMARY KEY,
                               job_name          VARCHAR(100) NOT NULL,
                               display_name      VARCHAR(255) NOT NULL,
                               job_group         VARCHAR(50)  NOT NULL DEFAULT 'GENERAL',
                               cron_expression   VARCHAR(100),
                               enabled           BOOLEAN      NOT NULL DEFAULT TRUE,
                               last_run_at       TIMESTAMPTZ,
                               last_status       VARCHAR(20),
                               last_error        TEXT,
                               last_duration_ms  BIGINT,
                               run_count         BIGINT       NOT NULL DEFAULT 0,
                               failure_count     BIGINT       NOT NULL DEFAULT 0,
                               created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

                               CONSTRAINT uq_scheduler_job_name UNIQUE (job_name),
                               CONSTRAINT ck_scheduler_job_status
                                   CHECK (last_status IS NULL OR last_status IN ('RUNNING', 'SUCCESS', 'FAILED'))
);

CREATE INDEX idx_scheduler_job_enabled ON scheduler_job(enabled);
CREATE INDEX idx_scheduler_job_group   ON scheduler_job(job_group);

INSERT INTO scheduler_job (job_name, display_name, job_group, cron_expression, enabled) VALUES
                                                                                            ('fx-fetch',          'TCMB Döviz Kuru Çekimi',        'MARKET_FX',     'cron-driven', TRUE),
                                                                                            ('fx-backfill',       'TCMB Geçmiş Kur Backfill',      'MARKET_FX',     'manual',      TRUE),
                                                                                            ('stocks-fetch',      'Yahoo Finance Hisse Çekimi',    'MARKET_STOCKS', 'cron-driven', TRUE),
                                                                                            ('stocks-backfill',   'Yahoo Finance Geçmiş Backfill', 'MARKET_STOCKS', 'manual',      TRUE),
                                                                                            ('stocks-indicators', 'Teknik Gösterge Hesaplama',     'MARKET_STOCKS', 'cron-driven', TRUE),
                                                                                            ('funds-fetch',       'TEFAS Fon Çekimi',              'MARKET_FUNDS',  'cron-driven', TRUE),
                                                                                            ('funds-backfill',    'TEFAS Geçmiş Fon Backfill',     'MARKET_FUNDS',  'manual',      TRUE),
                                                                                            ('bonds-fetch',       'TCMB EVDS Tahvil Çekimi',       'MARKET_BONDS',  'cron-driven', TRUE),
                                                                                            ('bonds-backfill',    'TCMB EVDS Geçmiş Backfill',     'MARKET_BONDS',  'manual',      TRUE),
                                                                                            ('news-fetch',        'RSS / News API Haber Çekimi',   'NEWS',          'cron-driven', TRUE),
                                                                                            ('trade-matcher',     'Bekleyen Trade Eşleştirme',     'PORTFOLIO',     'cron-driven', TRUE);

CREATE TABLE admin_notification (
                                    id          BIGSERIAL PRIMARY KEY,
                                    severity    VARCHAR(20)  NOT NULL,
                                    type        VARCHAR(50)  NOT NULL,
                                    title       VARCHAR(255) NOT NULL,
                                    message     TEXT,
                                    source      VARCHAR(100),
                                    metadata    JSONB,
                                    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
                                    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

                                    CONSTRAINT ck_admin_notification_severity
                                        CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

CREATE INDEX idx_admin_notification_created_at ON admin_notification(created_at DESC);
CREATE INDEX idx_admin_notification_is_read    ON admin_notification(is_read);
CREATE INDEX idx_admin_notification_severity   ON admin_notification(severity);