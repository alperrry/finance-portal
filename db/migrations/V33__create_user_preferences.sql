
CREATE TABLE user_preferences (
                                  id              BIGSERIAL    PRIMARY KEY,
                                  user_id         BIGINT       NOT NULL UNIQUE,

                                  theme           VARCHAR(16)  NOT NULL DEFAULT 'SYSTEM',
                                  locale          VARCHAR(8)   NOT NULL DEFAULT 'TR',

                                  density_compact BOOLEAN      NOT NULL DEFAULT FALSE,
                                  reduce_motion   BOOLEAN      NOT NULL DEFAULT FALSE,

                                  created_at      TIMESTAMP    NOT NULL,
                                  updated_at      TIMESTAMP    NOT NULL,

                                  CONSTRAINT fk_user_preferences_user
                                      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- user_id zaten UNIQUE; one-to-one ilişkiyi DB seviyesinde garanti eder.
CREATE INDEX idx_user_preferences_user_id ON user_preferences (user_id);