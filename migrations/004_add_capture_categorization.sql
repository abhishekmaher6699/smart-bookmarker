ALTER TABLE captures
ADD COLUMN IF NOT EXISTS category_id UUID
    REFERENCES capture_categories(id);

ALTER TABLE captures
ADD COLUMN IF NOT EXISTS tags TEXT[];
