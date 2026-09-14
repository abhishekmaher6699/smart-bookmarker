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