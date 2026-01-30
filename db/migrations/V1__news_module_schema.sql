-- V1__news_module_schema.sql

-- 1) SOURCES
CREATE TABLE IF NOT EXISTS sources (
                                       id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                       name        text NOT NULL,
                                       source_url  text NOT NULL,
                                       source_type text NOT NULL DEFAULT 'rss', -- rss | api
                                       api_key     text,
                                       is_active   boolean NOT NULL DEFAULT true,
                                       created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_sources_type CHECK (source_type IN ('rss','api'))
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_sources_source_url
    ON sources (source_url);

CREATE INDEX IF NOT EXISTS idx_sources_type_active
    ON sources (source_type, is_active);


-- 2) CATEGORIES (slug yok)
CREATE TABLE IF NOT EXISTS categories (
                                          id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                          name        text NOT NULL,
                                          is_active   boolean NOT NULL DEFAULT true,
                                          created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_categories_active
    ON categories (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name
    ON categories (name);

-- 3) NEWS
CREATE TABLE IF NOT EXISTS news (
                                    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                    title         text NOT NULL,
                                    context       text,
                                    published_at  timestamptz,

                                    canonical_url text NOT NULL,             -- RSS/API link
                                    external_id   text,                      -- RSS guid / API id (opsiyonel)

                                    status        text NOT NULL DEFAULT 'published',
                                    source_id     bigint NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,

    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ck_news_status CHECK (status IN ('published','archived','removed'))
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_news_canonical_url
    ON news (canonical_url);

CREATE UNIQUE INDEX IF NOT EXISTS uq_news_source_external_id
    ON news (source_id, external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_news_published_at_desc
    ON news (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_source_published_at_desc
    ON news (source_id, published_at DESC);


-- 4) NEWS_CATEGORIES
CREATE TABLE IF NOT EXISTS news_categories (
                                               news_id     bigint NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    category_id bigint NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (news_id, category_id)
    );

CREATE INDEX IF NOT EXISTS idx_news_categories_category_id
    ON news_categories (category_id);
