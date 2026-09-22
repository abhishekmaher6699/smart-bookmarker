CREATE INDEX captures_user_id_created_at_idx
    ON captures (user_id, created_at DESC);


CREATE INDEX captures_title_trgm_idx
    ON captures
    USING GIN (title gin_trgm_ops);


CREATE INDEX captures_description_trgm_idx
    ON captures
    USING GIN (description gin_trgm_ops);


CREATE INDEX capture_sources_capture_id_idx
    ON capture_sources (capture_id);


CREATE INDEX capture_search_documents_search_document_gin_idx
    ON capture_search_documents
    USING GIN (search_document);


CREATE INDEX enrichment_jobs_pending_idx
    ON enrichment_jobs (status, available_at);


CREATE INDEX refresh_tokens_family_id_idx
    ON refresh_tokens (family_id);


CREATE INDEX refresh_tokens_user_id_idx
    ON refresh_tokens (user_id);


CREATE INDEX password_reset_tokens_expires_at_idx
    ON password_reset_tokens (expires_at);


CREATE INDEX password_reset_tokens_user_id_idx
    ON password_reset_tokens (user_id);


CREATE INDEX email_verification_tokens_expires_at_idx
    ON email_verification_tokens (expires_at);


CREATE INDEX email_verification_tokens_user_id_idx
    ON email_verification_tokens (user_id);