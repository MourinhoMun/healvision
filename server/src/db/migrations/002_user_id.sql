-- Add user_id to cases for multi-user web support
ALTER TABLE cases ADD COLUMN user_id TEXT;
CREATE INDEX idx_cases_user ON cases(user_id);
