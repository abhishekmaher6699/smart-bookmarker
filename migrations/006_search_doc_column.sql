CREATE TABLE capture_search_documents (
    capture_id UUID PRIMARY KEY
        REFERENCES captures(id)
        ON DELETE CASCADE,

    search_document TSVECTOR NOT NULL,

    indexed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX capture_search_documents_search_document_gin_idx
ON capture_search_documents
USING GIN (search_document);


CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX captures_title_trgm_idx
ON captures
USING GIN (title gin_trgm_ops);

CREATE INDEX captures_description_trgm_idx
ON captures
USING GIN (description gin_trgm_ops);