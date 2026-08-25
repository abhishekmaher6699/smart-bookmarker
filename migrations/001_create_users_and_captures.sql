CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT get_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE captures (
    id UUID PRIMARY KEY DEFAULT get_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,

    type TEXT
        CHECK (
            type IN ('article', 'video', 'github', 'image', 'pdf')
        ),

    description TEXT,
    thumbnail_url TEXT,
    content TEXT,
    summary TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX captures_user_id_created_at_idx
ON captures (user_id, created_at DESC);

ALTER TABLE captures
ADD CONSTRAINT captures_user_url_unique
UNIQUE (user_id, url);

ALTER TABLE captures
ADD COLUMN enrichment_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE captures
ADD CONSTRAINT captures_enrichment_status_check
CHECK (
    enrichment_status IN (
        'pending',
        'processing',
        'completed',
        'failed'
    )
);