CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    email_verified_at TIMESTAMP
);


CREATE TABLE capture_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT capture_categories_user_id_name_key
        UNIQUE (user_id, name),

    CONSTRAINT capture_categories_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    type TEXT,
    description TEXT,
    thumbnail_url TEXT,
    content TEXT,
    summary TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    tags TEXT[],
    category_id UUID,

    CONSTRAINT captures_user_url_unique
        UNIQUE (user_id, url),

    CONSTRAINT captures_type_check
        CHECK (
            type = ANY (
                ARRAY[
                    'article'::text,
                    'video'::text,
                    'github'::text,
                    'image'::text,
                    'pdf'::text
                ]
            )
        ),

    CONSTRAINT captures_category_id_fkey
        FOREIGN KEY (category_id)
        REFERENCES capture_categories(id)
        ON DELETE SET NULL,

    CONSTRAINT captures_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE capture_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capture_id UUID NOT NULL,
    source_type TEXT NOT NULL,
    html TEXT,
    content TEXT,
    description TEXT,
    thumbnail_url TEXT,
    selected_text TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    title TEXT,
    type TEXT,

    CONSTRAINT capture_sources_source_type_check
        CHECK (
            source_type = ANY (
                ARRAY[
                    'browser'::text,
                    'server'::text
                ]
            )
        ),

    CONSTRAINT capture_sources_capture_id_fkey
        FOREIGN KEY (capture_id)
        REFERENCES captures(id)
        ON DELETE CASCADE
);


CREATE TABLE capture_search_documents (
    capture_id UUID PRIMARY KEY,
    search_document TSVECTOR NOT NULL,
    indexed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    embedding VECTOR(768),

    CONSTRAINT capture_search_documents_capture_id_fkey
        FOREIGN KEY (capture_id)
        REFERENCES captures(id)
        ON DELETE CASCADE
);


CREATE TABLE enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capture_id UUID NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    lease_id UUID,
    lease_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT enrichment_jobs_capture_type_unique
        UNIQUE (capture_id, type),

    CONSTRAINT enrichment_jobs_attempts_check
        CHECK (attempts >= 0),

    CONSTRAINT enrichment_jobs_status_check
        CHECK (
            status = ANY (
                ARRAY[
                    'pending'::text,
                    'processing'::text,
                    'completed'::text,
                    'failed'::text
                ]
            )
        ),

    CONSTRAINT enrichment_jobs_type_check
        CHECK (
            type = ANY (
                ARRAY[
                    'ingestion'::text,
                    'categorization'::text,
                    'summary'::text,
                    'embedding'::text
                ]
            )
        ),

    CONSTRAINT enrichment_jobs_capture_id_fkey
        FOREIGN KEY (capture_id)
        REFERENCES captures(id)
        ON DELETE CASCADE
);


CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITHOUT TIME ZONE,
    family_id UUID NOT NULL,

    CONSTRAINT refresh_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT password_reset_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT email_verification_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);