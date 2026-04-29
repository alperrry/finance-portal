CREATE TABLE user_chart_drawings (
                                     id                  BIGSERIAL PRIMARY KEY,
                                     user_id             BIGINT NOT NULL,
                                     instrument_type     VARCHAR(20) NOT NULL,
                                     instrument_code     VARCHAR(50) NOT NULL,
                                     drawing_type        VARCHAR(30) NOT NULL,
                                     drawing_data        JSONB NOT NULL,
                                     color               VARCHAR(20),
                                     line_width          INTEGER,
                                     created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                                     updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),

                                     CONSTRAINT fk_drawings_user FOREIGN KEY (user_id)
                                         REFERENCES users(id) ON DELETE RESTRICT,

                                     CONSTRAINT ck_drawings_instrument_type CHECK (
                                         instrument_type IN ('STOCK', 'CURRENCY', 'FUND', 'BOND', 'VIOP')
                                         ),

                                     CONSTRAINT ck_drawings_type CHECK (
                                         drawing_type IN ('TREND_LINE', 'HORIZONTAL_LINE', 'RECTANGLE')
                                         )
);

CREATE INDEX idx_drawings_user_id ON user_chart_drawings(user_id);
CREATE INDEX idx_drawings_user_instrument ON user_chart_drawings(user_id, instrument_type, instrument_code);
CREATE INDEX idx_drawings_created_at ON user_chart_drawings(created_at DESC);