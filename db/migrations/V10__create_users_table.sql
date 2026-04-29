CREATE TABLE users (
                       id              BIGSERIAL PRIMARY KEY,
                       keycloak_id     VARCHAR(36) UNIQUE NOT NULL,
                       username        VARCHAR(100) UNIQUE NOT NULL,
                       email           VARCHAR(255) UNIQUE NOT NULL,
                       first_name      VARCHAR(100),
                       last_name       VARCHAR(100),
                       role            VARCHAR(50) NOT NULL DEFAULT 'NORMAL_USER',
                       is_active       BOOLEAN NOT NULL DEFAULT true,
                       last_login_at   TIMESTAMPTZ,
                       created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                       CONSTRAINT ck_users_role CHECK (role IN ('NORMAL_USER', 'ADMIN'))
);

CREATE INDEX idx_users_keycloak_id ON users(keycloak_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);