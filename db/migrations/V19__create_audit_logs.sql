-- ============================================================================
-- V19__create_audit_logs.sql
-- ----------------------------------------------------------------------------
-- Admin modülünün audit log tablosu.
-- Tüm hassas admin aksiyonları (rol değiştirme, kullanıcı pasifleştirme,
-- kaynak silme vb.) bu tabloya yazılır.
--
-- Tasarım kararları:
--   1. actor_user_id ve actor_username birlikte tutulur. ID FK değildir;
--      kullanıcı silinse bile audit kaydı tarihsel olarak ayakta kalır.
--   2. JSONB tipi kullanılır. İleride GIN index ile field-level sorgu
--      yapılabilir (örn. "rolü ADMIN'e değiştirilen tüm kullanıcılar").
--   3. before_state ve after_state değişiklik diff'i için tutulur.
--      target_snapshot ise hedef objenin işlem anındaki tam halidir.
--   4. created_at TIMESTAMPTZ — UTC bazlı, timezone bilgisi taşır.
-- ============================================================================

CREATE TABLE audit_logs (
                            id              BIGSERIAL    PRIMARY KEY,
                            actor_user_id   BIGINT       NOT NULL,
                            actor_username  VARCHAR(100) NOT NULL,
                            action          VARCHAR(64)  NOT NULL,
                            target_type     VARCHAR(50)  NOT NULL,
                            target_id       BIGINT,
                            target_snapshot JSONB,
                            before_state    JSONB,
                            after_state     JSONB,
                            reason          TEXT,
                            ip_address      VARCHAR(45),
                            user_agent      TEXT,
                            created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- İndeksler
-- ----------------------------------------------------------------------------

-- Aktör bazlı sorgular ("Alper'in son 30 günde yaptığı işlemler")
CREATE INDEX idx_audit_logs_actor_user_id
    ON audit_logs (actor_user_id);

-- Aksiyon tipi bazlı sorgular ("Tüm USER_ROLE_CHANGED kayıtları")
CREATE INDEX idx_audit_logs_action
    ON audit_logs (action);

-- Hedef bazlı sorgular ("Kullanıcı 89 üzerinde yapılan tüm işlemler" — User Detail / Audit Trail tab)
CREATE INDEX idx_audit_logs_target
    ON audit_logs (target_type, target_id);

-- Zaman bazlı listeleme (audit log sayfası, en yeni üstte)
CREATE INDEX idx_audit_logs_created_at_desc
    ON audit_logs (created_at DESC);

-- ----------------------------------------------------------------------------
-- Yorumlar (DBA dokümantasyonu)
-- ----------------------------------------------------------------------------

COMMENT ON TABLE  audit_logs                  IS 'Admin modülü hassas işlem audit kayıtları. Salt-yazılır, güncellenmez.';
COMMENT ON COLUMN audit_logs.actor_user_id    IS 'İşlemi yapan admin kullanıcısının ID''si. FK değil — kullanıcı silinse bile kayıt korunur.';
COMMENT ON COLUMN audit_logs.actor_username   IS 'Aktör kullanıcı adı snapshot. Tarihsel kayıt için entity silinse de kalır.';
COMMENT ON COLUMN audit_logs.action           IS 'AuditAction enum değeri. Örnek: USER_ROLE_CHANGED, USER_STATUS_CHANGED.';
COMMENT ON COLUMN audit_logs.target_type      IS 'Hedef varlık tipi. Örnek: user, source, category, news, trade.';
COMMENT ON COLUMN audit_logs.target_id        IS 'Hedef kaydın ID''si. Toplu işlemler için NULL olabilir.';
COMMENT ON COLUMN audit_logs.target_snapshot  IS 'Hedef objenin işlem anındaki tam JSON gösterimi.';
COMMENT ON COLUMN audit_logs.before_state     IS 'Değişiklik öncesi alan değerleri (JSONB).';
COMMENT ON COLUMN audit_logs.after_state      IS 'Değişiklik sonrası alan değerleri (JSONB).';
COMMENT ON COLUMN audit_logs.reason           IS 'Admin tarafından girilen gerekçe. Hassas işlemlerde zorunlu (min 10 karakter).';
COMMENT ON COLUMN audit_logs.ip_address       IS 'İsteği yapan client IP adresi (IPv4 veya IPv6).';
COMMENT ON COLUMN audit_logs.user_agent       IS 'İsteği yapan tarayıcı / araç bilgisi.';
COMMENT ON COLUMN audit_logs.created_at       IS 'Audit kaydının oluşturulma zamanı (UTC).';