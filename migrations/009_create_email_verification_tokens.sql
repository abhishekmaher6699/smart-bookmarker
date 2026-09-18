ALTER TABLE users
ADD COLUMN email_verified_at TIMESTAMP NULL;

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX email_verification_tokens_user_id_idx
    ON email_verification_tokens(user_id);

CREATE INDEX email_verification_tokens_expires_at_idx
    ON email_verification_tokens(expires_at);