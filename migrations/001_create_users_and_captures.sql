CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE capture_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT capture_categories_user_name_unique
        UNIQUE (user_id, name)
);

CREATE INDEX capture_categories_user_id_idx
ON capture_categories(user_id);


CREATE TABLE captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    url TEXT NOT NULL,
    title TEXT,

    type TEXT
        CHECK (
            type IN (
                'article',
                'video',
                'github',
                'image',
                'pdf'
            )
        ),

    description TEXT,
    thumbnail_url TEXT,
    content TEXT,
    summary TEXT,
    category_id UUID
        REFERENCES capture_categories(id),
    tags TEXT[],

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT captures_user_url_unique
        UNIQUE (user_id, url)
);

CREATE INDEX captures_user_id_created_at_idx
ON captures (
    user_id,
    created_at DESC
);
