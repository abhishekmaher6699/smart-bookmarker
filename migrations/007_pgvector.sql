CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE capture_search_documents
ADD COLUMN embedding VECTOR(768);