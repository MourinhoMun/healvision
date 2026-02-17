CREATE TABLE cases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    surgery_type TEXT,
    surgery_type_custom TEXT,
    description TEXT,
    body_part TEXT,
    patient_gender TEXT,
    patient_age_range TEXT,
    patient_ethnicity TEXT,
    patient_body_type TEXT,
    target_image_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE source_images (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    day_number INTEGER NOT NULL,
    original_filename TEXT,
    exif_date TEXT,
    mime_type TEXT DEFAULT 'image/jpeg',
    width INTEGER,
    height INTEGER,
    protection_zones TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE generated_images (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    source_image_id TEXT REFERENCES source_images(id) ON DELETE SET NULL,
    day_number INTEGER NOT NULL,
    prompt_used TEXT NOT NULL,
    generation_mode TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    width INTEGER,
    height INTEGER,
    seed TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE case_tags (
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, tag_id)
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    encrypted INTEGER DEFAULT 0
);

-- Default settings
INSERT INTO settings (key, value, encrypted) VALUES
    ('api_endpoint', 'https://yunwu.ai/v1beta/models/gemini-3-pro-image-preview:generateContent', 0),
    ('api_key', '', 1),
    ('dev_password_hash', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 0),
    ('watermark_enabled', '1', 0),
    ('default_language', 'zh', 0);

CREATE INDEX idx_source_images_case ON source_images(case_id);
CREATE INDEX idx_source_images_day ON source_images(case_id, day_number);
CREATE INDEX idx_generated_images_case ON generated_images(case_id);
CREATE INDEX idx_generated_images_day ON generated_images(case_id, day_number);
