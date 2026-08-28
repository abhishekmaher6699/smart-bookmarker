CREATE TABLE capture_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    capture_id UUID NOT NULL
        REFERENCES captures(id)
        ON DELETE CASCADE,

    source_type TEXT NOT NULL
        CHECK (
            source_type IN (
                'browser',
                'server'
            )
        ),

    html TEXT,
    content TEXT,
    description TEXT,
    thumbnail_url TEXT,
    selected_text TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX capture_sources_capture_id_idx
ON capture_sources(capture_id);

ALTER TABLE capture_sources
ADD COLUMN title TEXT,
ADD COLUMN type TEXT;