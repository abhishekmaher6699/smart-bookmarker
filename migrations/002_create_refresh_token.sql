CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    family_id UUID NOT NULL,

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    revoked_at TIMESTAMP
);

CREATE INDEX refresh_tokens_user_id_idx
ON refresh_tokens(user_id);

CREATE INDEX refresh_tokens_family_id_idx
ON refresh_tokens(family_id);
